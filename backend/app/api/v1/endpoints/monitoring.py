from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_auth_or_public_display
from app.models.patient import Patient, PatientStatus
from app.models.bed import Bed
from app.models.room import Room
from app.models.user import User
from app.schemas.monitoring import (
    AtmosphereView,
    BedMonitoringView,
    BleDeviceView,
    MonitoringDashboard,
    MonitoringHealth,
    MonitorZoneUpdate,
)
from app.deps import get_current_active_user
from app.services.monitoring_service import (
    ATM_METRICS,
    fetch_atmosphere_for_zone,
    fetch_monitoring_snapshot,
    list_available_atm_zones,
    metrics_from_device,
    monitoring_service,
    normalize_mac,
    normalize_atm_zone,
    parse_online_flag,
    unwrap_metric,
)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sensors_updated_at(health_raw: Dict[str, Any], state: Dict[str, Any]) -> Optional[str]:
    return health_raw.get("updated_at") or state.get("updated_at")


def _resolve_monitor_zone(room: Room, available_zones: List[int]) -> Optional[int]:
    """Зона ATM — только явный monitor_zone или номер палаты, если такая зона есть на сервере."""
    if room.monitor_zone is not None:
        return room.monitor_zone
    try:
        zone = int(str(room.number).strip())
    except (TypeError, ValueError):
        return None
    if zone in available_zones:
        return zone
    return None


def _atmosphere_has_data(parsed: Dict[str, Any]) -> bool:
    return any(parsed.get(k) is not None for k in ATM_METRICS)


def _build_atmosphere_error(
    monitor_zone: Optional[int],
    available_zones: List[int],
    parsed: Dict[str, Any],
) -> Optional[str]:
    if _atmosphere_has_data(parsed):
        return None
    avail = ", ".join(str(z) for z in available_zones)
    if monitor_zone is None:
        if available_zones:
            return f"Зона ATM не привязана к палате. На сервере доступны зоны: {avail}"
        return "На сервере мониторинга нет данных ATM"
    if monitor_zone not in available_zones:
        if available_zones:
            return (
                f"Зона {monitor_zone} не найдена на сервере мониторинга. "
                f"Доступны зоны: {avail}. Укажите monitor_zone для этой палаты."
            )
        return f"Зона {monitor_zone}: нет данных с датчиков"
    return f"Зона {monitor_zone}: нет показаний с датчиков"


def _ble_view(mac: str, data: Optional[Dict[str, Any]]) -> Optional[BleDeviceView]:
    if not data:
        return None
    return BleDeviceView(
        mac=mac,
        online=parse_online_flag(data),
        metrics=metrics_from_device(data),
        updated_at=data.get("updated_at") or data.get("last_seen"),
    )


@router.get("/health")
def monitoring_health(
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    try:
        data = monitoring_service.get_health()
        return data
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/state")
def monitoring_state(
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    try:
        return monitoring_service.get_state()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/atm/{room}")
def monitoring_atm_room(
    room: int,
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    try:
        raw = monitoring_service.get_atm_room(room)
        return {"room": room, "raw": raw, "metrics": normalize_atm_zone(_as_dict(raw))}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/atm/{room}/{metric}")
def monitoring_atm_metric(
    room: int,
    metric: str,
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    try:
        raw = monitoring_service.get_atm_metric(room, metric)
        if isinstance(raw, dict):
            return {"room": room, "metric": metric.lower(), "value": unwrap_metric(raw), "raw": raw}
        return {"room": room, "metric": metric.lower(), "value": raw, "raw": raw}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


@router.get("/zones")
def monitoring_atm_zones(
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    try:
        snapshot = fetch_monitoring_snapshot(monitoring_service)
        zones = list_available_atm_zones(snapshot["atm"], monitoring_service)
        return {"zones": zones}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.patch("/rooms/{room_id}/zone")
def set_room_monitor_zone(
    room_id: int,
    body: MonitorZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    room.monitor_zone = body.monitor_zone
    db.commit()
    db.refresh(room)
    return {"room_id": room_id, "monitor_zone": room.monitor_zone}


@router.get("/dashboard", response_model=MonitoringDashboard)
def monitoring_dashboard(
    room_id: int = Query(..., description="ID палаты в БД"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    assigned_macs: set[str] = set()
    available_atm_zones: List[int] = []
    monitor_zone: Optional[int] = None

    try:
        snapshot = fetch_monitoring_snapshot(monitoring_service)
        available_atm_zones = list_available_atm_zones(snapshot["atm"], monitoring_service)
        monitor_zone = _resolve_monitor_zone(room, available_atm_zones)
        connected = bool(snapshot["health"].get("ok", True)) and "error" not in snapshot.get("state", {})
        health_raw = snapshot["health"]
        ble_map: Dict[str, Dict[str, Any]] = snapshot["ble"]
        atm_map: Dict[str, Dict[str, Any]] = snapshot["atm"]
        error = snapshot.get("state", {}).get("error")
    except Exception as exc:
        now = _utc_now_iso()
        return MonitoringDashboard(
            connected=False,
            error=str(exc),
            health=MonitoringHealth(ok=False, error=str(exc)),
            room_id=room_id,
            monitor_zone=monitor_zone,
            available_atm_zones=available_atm_zones,
            beds=[],
            unassigned_ble=[],
            refreshed_at=now,
        )

    parsed_atm: Dict[str, Any] = {}
    atmosphere = None
    atmosphere_error: Optional[str] = None

    if monitor_zone is not None:
        zone_key = str(monitor_zone)
        parsed_atm = dict(atm_map.get(zone_key) or {})
        if not _atmosphere_has_data(parsed_atm):
            parsed_atm = fetch_atmosphere_for_zone(monitoring_service, monitor_zone)
        else:
            for key in ATM_METRICS:
                if parsed_atm.get(key) is None:
                    try:
                        raw = monitoring_service.get_atm_metric(monitor_zone, key)
                        if is_atm_error_response(raw):
                            continue
                        parsed_atm[key] = unwrap_metric(raw) if isinstance(raw, dict) else raw
                    except Exception:
                        pass
        atmosphere = AtmosphereView(
            zone=monitor_zone,
            temp=parsed_atm.get("temp"),
            hum=parsed_atm.get("hum"),
            press=parsed_atm.get("press"),
            co2=parsed_atm.get("co2"),
        )
        atmosphere_error = _build_atmosphere_error(monitor_zone, available_atm_zones, parsed_atm)
    else:
        atmosphere_error = _build_atmosphere_error(None, available_atm_zones, {})

    room_beds = db.query(Bed).filter(Bed.room_id == room.id).all()

    patients_by_bed: Dict[int, Patient] = {}
    for bed in room_beds:
        for patient in bed.patients:
            if patient.status == PatientStatus.ACTIVE:
                patients_by_bed[bed.id] = patient

    beds: List[BedMonitoringView] = []
    for bed in room_beds:
        patient = patients_by_bed.get(bed.id)
        ble_mac = normalize_mac(patient.ble_mac) if patient and patient.ble_mac else None
        ble_data = ble_map.get(ble_mac) if ble_mac else None
        if ble_mac:
            assigned_macs.add(ble_mac)
        ble_view = None
        if ble_mac and ble_data:
            try:
                ble_view = _ble_view(ble_mac, ble_data)
            except Exception:
                ble_view = None
        beds.append(
            BedMonitoringView(
                bed_id=bed.id,
                bed_number=str(bed.number),
                patient_id=patient.id if patient else None,
                patient_name=patient.full_name if patient else None,
                ble_mac=ble_mac,
                ble=ble_view,
            )
        )

    unassigned: List[BleDeviceView] = []
    for mac, data in ble_map.items():
        if mac not in assigned_macs:
            try:
                view = _ble_view(mac, data)
                if view:
                    unassigned.append(view)
            except Exception:
                continue

    state_raw = snapshot.get("state") or {}
    sensors_at = _sensors_updated_at(health_raw, state_raw if isinstance(state_raw, dict) else {})
    now = _utc_now_iso()

    health = MonitoringHealth(
        ok=bool(health_raw.get("ok", True)),
        updated_at=sensors_at,
        device_count=health_raw.get("device_count") or health_raw.get("devices") or len(ble_map),
        error=health_raw.get("error") or error,
    )

    return MonitoringDashboard(
        connected=connected,
        error=error,
        health=health,
        room_id=room_id,
        monitor_zone=monitor_zone,
        available_atm_zones=available_atm_zones,
        atmosphere_error=atmosphere_error,
        atmosphere=atmosphere,
        beds=beds,
        unassigned_ble=unassigned,
        refreshed_at=now,
        sensors_updated_at=sensors_at,
    )
