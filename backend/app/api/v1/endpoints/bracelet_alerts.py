"""API мониторинга браслетов и оповещений."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.bracelet_alerts.assignment import (
    assign_bracelet_to_patient,
    distribute_unassigned_bracelets,
    get_unassigned_devices,
    unassign_bracelet_from_patient,
)
from app.bracelet_alerts.max_notifier import MaxBotNotifier
from app.bracelet_alerts.patient_thresholds import (
    build_thresholds_response,
    clear_patient_thresholds,
    get_patient_or_none,
    sanitize_overrides,
    update_patient_thresholds,
)
from app.bracelet_alerts.service import BraceletAlertService
from app.bracelet_alerts.threshold_resolver import default_thresholds_dict
from app.bracelet_alerts.types import PatientBraceletSnapshot
from app.core.config import settings
from app.core.database import get_db
from app.deps import get_current_active_user
from app.models.user import User, UserRole
from app.schemas.bracelet_alerts import (
    AssignBraceletRequest,
    AssignBraceletResponse,
    BraceletAssignmentPair,
    BraceletCheckResponse,
    BraceletOverviewResponse,
    DistributeBraceletsResponse,
    MetricThresholdValues,
    PatientBraceletView,
    PatientVitalThresholdsResponse,
    PatientVitalThresholdsUpdate,
    UnassignBraceletResponse,
    UnassignedBleDeviceView,
    VitalAlertView,
)

router = APIRouter(prefix="/bracelet-alerts", tags=["Bracelet Alerts"])


def _snapshot_to_view(snap: PatientBraceletSnapshot) -> PatientBraceletView:
    return PatientBraceletView(
        patient_id=snap.patient_id,
        patient_name=snap.patient_name,
        ble_mac=snap.ble_mac,
        room_number=snap.room_number,
        bed_number=snap.bed_number,
        online=snap.online,
        metrics=snap.metrics,
        alerts=[
            VitalAlertView(
                metric=a.metric,
                label=a.label,
                value=a.value,
                unit=a.unit,
                level=a.level.value,
                message=a.message,
                normal_range=a.normal_range,
            )
            for a in snap.alerts
        ],
        has_custom_thresholds=snap.has_custom_thresholds,
    )


def _thresholds_response(data: dict) -> PatientVitalThresholdsResponse:
    return PatientVitalThresholdsResponse(
        patient_id=data["patient_id"],
        has_custom=data["has_custom"],
        defaults={k: MetricThresholdValues(**v) for k, v in data["defaults"].items()},
        overrides=data["overrides"],
        effective={k: MetricThresholdValues(**v) for k, v in data["effective"].items()},
    )


def _require_nurse_or_admin(user: User) -> None:
    if user.role not in (UserRole.ADMIN, UserRole.NURSE):
        raise HTTPException(status_code=403, detail="Not enough permissions")


@router.get("/defaults")
def bracelet_default_thresholds(
    current_user: User = Depends(get_current_active_user),
):
    _require_nurse_or_admin(current_user)
    return {"defaults": default_thresholds_dict()}


@router.get("/patients/{patient_id}/thresholds", response_model=PatientVitalThresholdsResponse)
def get_patient_thresholds(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_nurse_or_admin(current_user)
    patient = get_patient_or_none(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _thresholds_response(build_thresholds_response(patient))


@router.put("/patients/{patient_id}/thresholds", response_model=PatientVitalThresholdsResponse)
def put_patient_thresholds(
    patient_id: int,
    body: PatientVitalThresholdsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_nurse_or_admin(current_user)
    patient = get_patient_or_none(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    payload = body.model_dump(exclude_none=True)
    data = update_patient_thresholds(db, patient, payload)
    return _thresholds_response(data)


@router.delete("/patients/{patient_id}/thresholds", response_model=PatientVitalThresholdsResponse)
def delete_patient_thresholds(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_nurse_or_admin(current_user)
    patient = get_patient_or_none(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _thresholds_response(clear_patient_thresholds(db, patient))


@router.get("/overview", response_model=BraceletOverviewResponse)
def bracelet_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_nurse_or_admin(current_user)
    service = BraceletAlertService()
    result = service.get_overview(db)
    notifier = MaxBotNotifier()
    unassigned_raw, _, unassigned_err = get_unassigned_devices(db)
    patients_without_mac = sum(1 for s in result.snapshots if not s.ble_mac)
    overview_error = result.error or unassigned_err
    return BraceletOverviewResponse(
        checked_at=result.checked_at,
        patients_total=result.patients_total,
        patients_with_ble=result.patients_with_ble,
        patients_online=result.patients_online,
        patients_without_mac=patients_without_mac,
        alerts_found=result.alerts_found,
        monitoring_connected=result.monitoring_connected,
        max_bot_configured=notifier.is_configured,
        alerts_enabled=settings.BRACELET_ALERTS_ENABLED,
        error=overview_error,
        patients=[_snapshot_to_view(s) for s in result.snapshots],
        unassigned_devices=[
            UnassignedBleDeviceView(
                mac=d["mac"],
                online=d.get("online"),
                metrics=d.get("metrics") or {},
            )
            for d in unassigned_raw
        ],
    )


@router.delete("/patients/{patient_id}/bracelet", response_model=UnassignBraceletResponse)
def unassign_bracelet(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Отвязать браслет от пациента."""
    _require_nurse_or_admin(current_user)
    try:
        data = unassign_bracelet_from_patient(db, patient_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UnassignBraceletResponse(**data)


@router.post("/assign-bracelet", response_model=AssignBraceletResponse)
def assign_bracelet(
    body: AssignBraceletRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Привязать выбранный браслет к выбранному пациенту."""
    _require_nurse_or_admin(current_user)
    try:
        data = assign_bracelet_to_patient(db, body.patient_id, body.ble_mac)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AssignBraceletResponse(
        pair=BraceletAssignmentPair(**data["pair"]),
        monitoring_connected=data["monitoring_connected"],
        message=data["message"],
        error=data.get("error"),
    )


@router.post("/distribute-bracelets", response_model=DistributeBraceletsResponse)
def distribute_bracelets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Привязать свободные браслеты к пациентам без MAC."""
    _require_nurse_or_admin(current_user)
    data = distribute_unassigned_bracelets(db)
    return DistributeBraceletsResponse(
        assigned_count=data["assigned_count"],
        pairs=data["pairs"],
        patients_without_mac_remaining=data["patients_without_mac_remaining"],
        unassigned_devices_remaining=data["unassigned_devices_remaining"],
        monitoring_connected=data["monitoring_connected"],
        message=data["message"],
        error=data.get("error"),
    )


@router.post("/check", response_model=BraceletCheckResponse)
def bracelet_check_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Ручной запуск проверки и отправки в MAX."""
    _require_nurse_or_admin(current_user)
    service = BraceletAlertService()
    result = service.check_and_notify(db, send_to_max=True)
    return BraceletCheckResponse(
        checked_at=result.checked_at,
        alerts_found=result.alerts_found,
        alerts_sent=result.alerts_sent,
        alerts_skipped_dedup=result.alerts_skipped_dedup,
        monitoring_connected=result.monitoring_connected,
        message=(
            f"Найдено отклонений: {result.alerts_found}, "
            f"отправлено в MAX: {result.alerts_sent}"
        ),
    )


@router.post("/test-max")
def bracelet_test_max(
    current_user: User = Depends(get_current_active_user),
):
    """Тестовое сообщение в чат MAX."""
    _require_nurse_or_admin(current_user)
    notifier = MaxBotNotifier()
    if not notifier.is_configured:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail="MAX_BOT_TOKEN и MAX_ALERT_CHAT_ID не заданы",
        )
    ok = notifier.send_text("✅ Тест: оповещения браслетов медцентра работают.")
    if not ok:
        from fastapi import HTTPException

        raise HTTPException(status_code=502, detail="Не удалось отправить сообщение в MAX")
    return {"ok": True}
