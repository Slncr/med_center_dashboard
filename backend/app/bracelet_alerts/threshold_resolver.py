"""Слияние дефолтных порогов с персональными настройками пациента."""
from __future__ import annotations

from typing import Any, Dict, Optional

from app.bracelet_alerts.thresholds import (
    BRACELET_THRESHOLDS,
    CANONICAL_METRICS,
    MetricThreshold,
)

_THRESHOLD_FIELDS = (
    "normal_min",
    "normal_max",
    "warning_low",
    "warning_high",
    "critical_low",
    "critical_high",
)


def merge_threshold(base: MetricThreshold, override: Dict[str, Any]) -> MetricThreshold:
    values = {field: getattr(base, field) for field in _THRESHOLD_FIELDS}
    for field in _THRESHOLD_FIELDS:
        if field in override and override[field] is not None:
            values[field] = float(override[field])
    return MetricThreshold(
        key=base.key,
        label=base.label,
        unit=base.unit,
        **values,
    )


def get_patient_threshold_map(
    overrides: Optional[Dict[str, Any]],
) -> Dict[str, MetricThreshold]:
    """Активные пороги по всем каноническим показателям."""
    result: Dict[str, MetricThreshold] = {}
    for key in CANONICAL_METRICS:
        base = BRACELET_THRESHOLDS[key]
        patient_override = (overrides or {}).get(key) if overrides else None
        if patient_override and isinstance(patient_override, dict) and patient_override:
            result[key] = merge_threshold(base, patient_override)
        else:
            result[key] = base
    return result


def has_custom_thresholds(overrides: Optional[Dict[str, Any]]) -> bool:
    if not overrides:
        return False
    for key in CANONICAL_METRICS:
        block = overrides.get(key)
        if isinstance(block, dict) and block:
            return True
    return False


def threshold_to_dict(threshold: MetricThreshold) -> Dict[str, Any]:
    return {
        "label": threshold.label,
        "unit": threshold.unit,
        **{field: getattr(threshold, field) for field in _THRESHOLD_FIELDS},
    }


def default_thresholds_dict() -> Dict[str, Dict[str, Any]]:
    return {
        key: threshold_to_dict(BRACELET_THRESHOLDS[key])
        for key in CANONICAL_METRICS
    }
