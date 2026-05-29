"""Сбор показателей браслетов активных пациентов."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.bracelet_alerts.evaluator import evaluate_metrics, normalize_bracelet_metrics
from app.bracelet_alerts.threshold_resolver import get_patient_threshold_map, has_custom_thresholds
from app.bracelet_alerts.types import PatientBraceletSnapshot
from app.models.bed import Bed
from app.models.patient import Patient, PatientStatus
from app.models.room import Room
from app.services.monitoring_service import (
    fetch_monitoring_snapshot,
    metrics_from_device,
    monitoring_service,
    normalize_mac,
    parse_online_flag,
)

logger = logging.getLogger(__name__)


def _room_bed_labels(patient: Patient) -> tuple[Optional[str], Optional[str]]:
    bed = patient.bed
    if not bed:
        return None, None
    room = bed.room if hasattr(bed, "room") else None
    room_number = str(room.number) if room else None
    bed_number = str(bed.number) if bed.number is not None else None
    return room_number, bed_number


def collect_patient_snapshots(db: Session) -> tuple[List[PatientBraceletSnapshot], bool, Optional[str]]:
    patients = (
        db.query(Patient)
        .options(joinedload(Patient.bed).joinedload(Bed.room))
        .filter(Patient.status == PatientStatus.ACTIVE)
        .all()
    )

    monitoring_connected = False
    monitoring_error: Optional[str] = None
    ble_map: Dict[str, Dict[str, Any]] = {}

    try:
        snapshot = fetch_monitoring_snapshot(monitoring_service)
        monitoring_connected = bool(snapshot["health"].get("ok", True)) and "error" not in snapshot.get(
            "state", {}
        )
        ble_map = snapshot.get("ble") or {}
        if snapshot.get("state", {}).get("error"):
            monitoring_error = str(snapshot["state"]["error"])
    except Exception as exc:
        logger.warning("Monitoring snapshot failed: %s", exc)
        monitoring_error = str(exc)

    results: List[PatientBraceletSnapshot] = []

    for patient in patients:
        mac = normalize_mac(patient.ble_mac) if patient.ble_mac else None
        room_number, bed_number = _room_bed_labels(patient)

        custom = has_custom_thresholds(patient.vital_threshold_overrides)
        threshold_map = get_patient_threshold_map(patient.vital_threshold_overrides)

        if not mac:
            results.append(
                PatientBraceletSnapshot(
                    patient_id=patient.id,
                    patient_name=patient.full_name,
                    ble_mac=None,
                    room_number=room_number,
                    bed_number=bed_number,
                    online=None,
                    metrics={},
                    alerts=[],
                    has_custom_thresholds=custom,
                )
            )
            continue

        device = ble_map.get(mac)
        if not device:
            results.append(
                PatientBraceletSnapshot(
                    patient_id=patient.id,
                    patient_name=patient.full_name,
                    ble_mac=mac,
                    room_number=room_number,
                    bed_number=bed_number,
                    online=False,
                    metrics={},
                    alerts=[],
                    has_custom_thresholds=custom,
                )
            )
            continue

        metrics = normalize_bracelet_metrics(metrics_from_device(device))
        alerts = evaluate_metrics(metrics, threshold_map)

        results.append(
            PatientBraceletSnapshot(
                patient_id=patient.id,
                patient_name=patient.full_name,
                ble_mac=mac,
                room_number=room_number,
                bed_number=bed_number,
                online=parse_online_flag(device),
                metrics=metrics,
                alerts=alerts,
                has_custom_thresholds=custom,
            )
        )

    return results, monitoring_connected, monitoring_error
