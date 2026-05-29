"""CRUD персональных порогов пациента."""
from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.bracelet_alerts.threshold_resolver import (
    default_thresholds_dict,
    get_patient_threshold_map,
    has_custom_thresholds,
    threshold_to_dict,
)
from app.bracelet_alerts.thresholds import CANONICAL_METRICS
from app.models.patient import Patient

_FIELDS = (
    "normal_min",
    "normal_max",
    "warning_low",
    "warning_high",
    "critical_low",
    "critical_high",
)


def _clean_metric_block(block: Optional[Dict[str, Any]]) -> Optional[Dict[str, float]]:
    if not block:
        return None
    cleaned: Dict[str, float] = {}
    for field in _FIELDS:
        if field in block and block[field] is not None and block[field] != "":
            cleaned[field] = float(block[field])
    return cleaned or None


def sanitize_overrides(raw: Optional[Dict[str, Any]]) -> Optional[Dict[str, Dict[str, float]]]:
    if not raw:
        return None
    result: Dict[str, Dict[str, float]] = {}
    for metric in CANONICAL_METRICS:
        block = _clean_metric_block(raw.get(metric))
        if block:
            result[metric] = block
    return result or None


def get_patient_or_none(db: Session, patient_id: int) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def build_thresholds_response(patient: Patient) -> Dict[str, Any]:
    overrides = patient.vital_threshold_overrides
    effective = {
        key: threshold_to_dict(th)
        for key, th in get_patient_threshold_map(overrides).items()
    }
    return {
        "patient_id": patient.id,
        "has_custom": has_custom_thresholds(overrides),
        "defaults": default_thresholds_dict(),
        "overrides": overrides,
        "effective": effective,
    }


def update_patient_thresholds(
    db: Session,
    patient: Patient,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    patient.vital_threshold_overrides = sanitize_overrides(payload)
    db.commit()
    db.refresh(patient)
    return build_thresholds_response(patient)


def clear_patient_thresholds(db: Session, patient: Patient) -> Dict[str, Any]:
    patient.vital_threshold_overrides = None
    db.commit()
    db.refresh(patient)
    return build_thresholds_response(patient)
