from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
import redis

from app.core.config import settings
from app.core.database import get_db
from app.core.websocket_manager import manager
from app.deps import get_current_active_user
from app.models.medical import MedicalRecord, PrescriptionStatus
from app.models.patient import Patient, PatientStatus
from app.models.user import User, UserRole
from app.schemas.monitoring import AtmosphereView
from app.services.monitoring_service import fetch_atmosphere_for_zone, monitoring_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/operating-room", tags=["Operating Room"])

REDIS_KEY = "operating_room:state"


class OrStatus(str, Enum):
    surgery = "surgery"
    free = "free"
    cleaning = "cleaning"
    sterilization = "sterilization"


class AtmosphereSource(str, Enum):
    manual = "manual"
    sensor = "sensor"


class OrStatusUpdate(BaseModel):
    status: OrStatus


class OrStatusResponse(BaseModel):
    status: OrStatus
    updated_at: Optional[str] = None


class OrDisplaySettings(BaseModel):
    show_stats: bool = True
    show_atmosphere: bool = True
    show_announcements: bool = True


class OrDisplaySettingsUpdate(BaseModel):
    show_stats: Optional[bool] = None
    show_atmosphere: Optional[bool] = None
    show_announcements: Optional[bool] = None


class OrAnnouncement(BaseModel):
    id: str
    text: str
    created_at: str


class OrAnnouncementCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class OrAtmosphereConfig(BaseModel):
    source: AtmosphereSource = AtmosphereSource.manual
    monitor_zone: Optional[int] = None
    temp: Optional[float] = None
    hum: Optional[float] = None
    press: Optional[float] = None


class OrAtmosphereUpdate(BaseModel):
    source: AtmosphereSource = AtmosphereSource.manual
    monitor_zone: Optional[int] = None
    temp: Optional[float] = None
    hum: Optional[float] = None
    press: Optional[float] = None


class OrStatsView(BaseModel):
    active_patients: int = 0
    awaiting_examination: int = 0
    active_prescriptions: int = 0
    completed_prescriptions: int = 0
    ready_for_discharge: int = 0


class OrConfigResponse(BaseModel):
    status: OrStatus
    updated_at: Optional[str] = None
    display: OrDisplaySettings
    announcements: List[OrAnnouncement]
    atmosphere_config: OrAtmosphereConfig
    atmosphere: Optional[AtmosphereView] = None


class OrBoardResponse(OrConfigResponse):
    atmosphere_error: Optional[str] = None
    stats: OrStatsView


_DEFAULT_STATE: Dict[str, Any] = {
    "status": OrStatus.free.value,
    "updated_at": None,
    "display": {
        "show_stats": True,
        "show_atmosphere": True,
        "show_announcements": True,
    },
    "announcements": [],
    "atmosphere": {
        "source": AtmosphereSource.manual.value,
        "monitor_zone": None,
        "temp": None,
        "hum": None,
        "press": None,
    },
}

_or_state: Dict[str, Any] = json.loads(json.dumps(_DEFAULT_STATE))
_redis: Optional[redis.Redis] = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_redis() -> Optional[redis.Redis]:
    global _redis
    if _redis is not None:
        return _redis
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=1)
        client.ping()
        _redis = client
        return _redis
    except Exception as exc:
        logger.warning("OR Redis unavailable: %s", exc)
        return None


def _load_state() -> None:
    global _or_state
    client = _get_redis()
    if not client:
        return
    try:
        raw = client.get(REDIS_KEY)
        if not raw:
            return
        data = json.loads(raw)
        if isinstance(data, dict) and "status" in data:
            merged = json.loads(json.dumps(_DEFAULT_STATE))
            merged.update({k: data.get(k, merged[k]) for k in merged.keys()})
            if isinstance(data.get("display"), dict):
                merged["display"].update(data["display"])
            if isinstance(data.get("atmosphere"), dict):
                merged["atmosphere"].update(data["atmosphere"])
            if isinstance(data.get("announcements"), list):
                merged["announcements"] = data["announcements"]
            _or_state = merged
    except Exception as exc:
        logger.warning("OR state load failed: %s", exc)


def _save_state() -> None:
    client = _get_redis()
    if not client:
        return
    try:
        client.set(REDIS_KEY, json.dumps(_or_state, ensure_ascii=False))
    except Exception as exc:
        logger.warning("OR state save failed: %s", exc)


_load_state()


def _require_admin(user: User) -> None:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    if role.lower() != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администратор может изменять настройки операционной",
        )


def _display_settings() -> OrDisplaySettings:
    return OrDisplaySettings(**_or_state["display"])


def _atmosphere_config() -> OrAtmosphereConfig:
    raw = _or_state["atmosphere"]
    return OrAtmosphereConfig(
        source=AtmosphereSource(raw["source"]),
        monitor_zone=raw.get("monitor_zone"),
        temp=raw.get("temp"),
        hum=raw.get("hum"),
        press=raw.get("press"),
    )


def _announcements() -> List[OrAnnouncement]:
    return [OrAnnouncement(**item) for item in _or_state["announcements"]]


def _manual_atmosphere_view() -> AtmosphereView:
    cfg = _or_state["atmosphere"]
    return AtmosphereView(
        zone=cfg.get("monitor_zone"),
        temp=cfg.get("temp"),
        hum=cfg.get("hum"),
        press=cfg.get("press"),
        co2=None,
    )


def get_or_status_payload() -> Dict[str, Any]:
    return {
        "type": "or_status_changed",
        "status": _or_state["status"],
        "updated_at": _or_state["updated_at"],
    }


def get_or_board_payload() -> Dict[str, Any]:
    cfg = _atmosphere_config()
    atmosphere_payload = None
    if cfg.source == AtmosphereSource.manual:
        atmosphere_payload = _manual_atmosphere_view().model_dump()
    elif _atm_cache.get("zone") == cfg.monitor_zone and _atm_cache.get("atmosphere"):
        atmosphere_payload = _atm_cache["atmosphere"]
    return {
        "type": "or_board_changed",
        "status": _or_state["status"],
        "updated_at": _or_state["updated_at"],
        "display": dict(_or_state["display"]),
        "announcements": list(_or_state["announcements"]),
        "atmosphere_config": dict(_or_state["atmosphere"]),
        "atmosphere": atmosphere_payload,
    }


async def _broadcast_or_state() -> None:
    await manager.broadcast(get_or_status_payload(), "or")
    await manager.broadcast(get_or_board_payload(), "or")


def _touch_and_persist() -> None:
    _or_state["updated_at"] = _utc_now_iso()
    _save_state()


# Кэш последних успешных показаний датчиков — UI не мигает при кратком сбое
_atm_cache: Dict[str, Any] = {
    "zone": None,
    "atmosphere": None,
    "updated_at": None,
}


def _resolve_sensor_atmosphere() -> tuple[Optional[AtmosphereView], Optional[str]]:
    """Читаем зону ATM с таймаутом; при сбое отдаём последний удачный снимок."""
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

    cfg = _or_state["atmosphere"]
    zone = cfg.get("monitor_zone")
    if zone is None:
        return None, "Не задана зона датчиков атмосферы"

    zone_i = int(zone)
    cached = None
    if _atm_cache.get("zone") == zone_i and _atm_cache.get("atmosphere"):
        cached = AtmosphereView(**_atm_cache["atmosphere"])

    pool = ThreadPoolExecutor(max_workers=1)
    try:
        parsed = pool.submit(
            fetch_atmosphere_for_zone, monitoring_service, zone_i
        ).result(timeout=2.5)
        atmosphere = AtmosphereView(
            zone=zone_i,
            temp=parsed.get("temp"),
            hum=parsed.get("hum"),
            press=parsed.get("press"),
            co2=parsed.get("co2"),
        )
        if not any(getattr(atmosphere, key) is not None for key in ("temp", "hum", "press")):
            if cached is not None:
                return cached, f"Зона {zone_i}: нет новых показаний, показан последний снимок"
            return atmosphere, f"Зона {zone_i}: нет показаний с датчиков"
        _atm_cache["zone"] = zone_i
        _atm_cache["atmosphere"] = atmosphere.model_dump()
        _atm_cache["updated_at"] = _utc_now_iso()
        return atmosphere, None
    except FuturesTimeout:
        if cached is not None:
            return cached, f"Таймаут датчиков (зона {zone_i}), показан последний снимок"
        return None, f"Таймаут датчиков (зона {zone_i})"
    except Exception as exc:
        logger.warning("OR atmosphere zone %s failed: %s", zone_i, exc)
        if cached is not None:
            return cached, f"Ошибка мониторинга (зона {zone_i}), показан последний снимок"
        return None, f"Ошибка мониторинга (зона {zone_i}): {exc}"
    finally:
        pool.shutdown(wait=False, cancel_futures=True)


def _resolve_atmosphere() -> tuple[Optional[AtmosphereView], Optional[str]]:
    cfg = _or_state["atmosphere"]
    if cfg.get("source") == AtmosphereSource.sensor.value:
        return _resolve_sensor_atmosphere()
    return _manual_atmosphere_view(), None


def _compute_stats(db: Session) -> OrStatsView:
    patients = (
        db.query(Patient)
        .options(joinedload(Patient.prescriptions))
        .filter(Patient.status == PatientStatus.ACTIVE)
        .all()
    )
    patient_ids = [p.id for p in patients]
    obs_counts: Dict[int, int] = {pid: 0 for pid in patient_ids}
    if patient_ids:
        records = (
            db.query(MedicalRecord.patient_id)
            .filter(MedicalRecord.patient_id.in_(patient_ids))
            .all()
        )
        for (pid,) in records:
            obs_counts[pid] = obs_counts.get(pid, 0) + 1

    awaiting = 0
    active_prescriptions = 0
    completed_prescriptions = 0
    ready_for_discharge = 0

    for patient in patients:
        prescriptions = list(patient.prescriptions or [])
        obs_count = obs_counts.get(patient.id, 0)
        if not prescriptions and obs_count == 0:
            awaiting += 1
        if any(p.status == PrescriptionStatus.ACTIVE for p in prescriptions):
            active_prescriptions += 1
        if prescriptions and all(p.status == PrescriptionStatus.COMPLETED for p in prescriptions):
            completed_prescriptions += 1
        if prescriptions and not any(p.status == PrescriptionStatus.ACTIVE for p in prescriptions):
            ready_for_discharge += 1

    return OrStatsView(
        active_patients=len(patients),
        awaiting_examination=awaiting,
        active_prescriptions=active_prescriptions,
        completed_prescriptions=completed_prescriptions,
        ready_for_discharge=ready_for_discharge,
    )


def _build_config() -> OrConfigResponse:
    cfg = _atmosphere_config()
    # Ручной режим — сразу значения. Датчики — только через /board, чтобы не тормозить админку.
    atmosphere = _manual_atmosphere_view() if cfg.source == AtmosphereSource.manual else None
    return OrConfigResponse(
        status=OrStatus(_or_state["status"]),
        updated_at=_or_state["updated_at"],
        display=_display_settings(),
        announcements=_announcements(),
        atmosphere_config=cfg,
        atmosphere=atmosphere,
    )


def _build_board(db: Session) -> OrBoardResponse:
    atmosphere, atmosphere_error = _resolve_atmosphere()
    return OrBoardResponse(
        status=OrStatus(_or_state["status"]),
        updated_at=_or_state["updated_at"],
        display=_display_settings(),
        announcements=_announcements(),
        atmosphere_config=_atmosphere_config(),
        atmosphere=atmosphere,
        atmosphere_error=atmosphere_error,
        stats=_compute_stats(db),
    )


@router.get("/atmosphere", response_model=dict)
def get_operating_room_atmosphere() -> dict:
    """Живые показания для инфоэкрана / превью в админке."""
    atmosphere, atmosphere_error = _resolve_atmosphere()
    return {
        "atmosphere_config": _atmosphere_config().model_dump(),
        "atmosphere": atmosphere.model_dump() if atmosphere else None,
        "atmosphere_error": atmosphere_error,
    }


@router.get("/status", response_model=OrStatusResponse)
def get_operating_room_status() -> OrStatusResponse:
    return OrStatusResponse(
        status=OrStatus(_or_state["status"]),
        updated_at=_or_state["updated_at"],
    )


@router.put("/status", response_model=OrStatusResponse)
async def set_operating_room_status(body: OrStatusUpdate) -> OrStatusResponse:
    _or_state["status"] = body.status.value
    _touch_and_persist()
    await _broadcast_or_state()
    return OrStatusResponse(
        status=body.status,
        updated_at=_or_state["updated_at"],
    )


@router.get("/config", response_model=OrConfigResponse)
def get_operating_room_config() -> OrConfigResponse:
    """Лёгкий снимок для админки (без БД и внешнего мониторинга)."""
    return _build_config()


@router.get("/board", response_model=OrBoardResponse)
def get_operating_room_board(db: Session = Depends(get_db)) -> OrBoardResponse:
    return _build_board(db)


@router.put("/display", response_model=OrDisplaySettings)
async def update_operating_room_display(
    body: OrDisplaySettingsUpdate,
    current_user: User = Depends(get_current_active_user),
) -> OrDisplaySettings:
    _require_admin(current_user)
    for key in ("show_stats", "show_atmosphere", "show_announcements"):
        value = getattr(body, key)
        if value is not None:
            _or_state["display"][key] = value
    _touch_and_persist()
    await _broadcast_or_state()
    return _display_settings()


@router.put("/atmosphere", response_model=OrAtmosphereConfig)
async def update_operating_room_atmosphere(
    body: OrAtmosphereUpdate,
    current_user: User = Depends(get_current_active_user),
) -> OrAtmosphereConfig:
    _require_admin(current_user)
    _or_state["atmosphere"] = {
        "source": body.source.value,
        "monitor_zone": body.monitor_zone,
        "temp": body.temp,
        "hum": body.hum,
        "press": body.press,
    }
    _touch_and_persist()
    await _broadcast_or_state()
    return _atmosphere_config()


@router.post("/announcements", response_model=OrAnnouncement)
async def create_operating_room_announcement(
    body: OrAnnouncementCreate,
    current_user: User = Depends(get_current_active_user),
) -> OrAnnouncement:
    _require_admin(current_user)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст объявления пуст")
    item = {
        "id": str(uuid4()),
        "text": text,
        "created_at": _utc_now_iso(),
    }
    _or_state["announcements"].insert(0, item)
    _or_state["announcements"] = _or_state["announcements"][:50]
    _touch_and_persist()
    await _broadcast_or_state()
    return OrAnnouncement(**item)


@router.delete("/announcements/{announcement_id}", response_model=dict)
async def delete_operating_room_announcement(
    announcement_id: str,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    _require_admin(current_user)
    before = len(_or_state["announcements"])
    _or_state["announcements"] = [
        item for item in _or_state["announcements"] if item["id"] != announcement_id
    ]
    if len(_or_state["announcements"]) == before:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    _touch_and_persist()
    await _broadcast_or_state()
    return {"ok": True}
