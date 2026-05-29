"""Проверка показателей браслета на выход за норму."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.bracelet_alerts.thresholds import (
    BRACELET_THRESHOLDS,
    METRIC_ALIASES,
    AlertLevel,
    MetricThreshold,
)
from app.bracelet_alerts.types import VitalAlert


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _format_range(threshold: MetricThreshold) -> str:
    if threshold.normal_min is not None and threshold.normal_max is not None:
        return f"{threshold.normal_min:g}–{threshold.normal_max:g} {threshold.unit}"
    if threshold.normal_min is not None:
        return f"≥ {threshold.normal_min:g} {threshold.unit}"
    if threshold.normal_max is not None:
        return f"≤ {threshold.normal_max:g} {threshold.unit}"
    return "—"


def _evaluate_value(threshold: MetricThreshold, value: float) -> AlertLevel:
    """SpO₂ — чем ниже, тем хуже; пульс — в обе стороны."""
    if threshold.critical_low is not None and value < threshold.critical_low:
        return AlertLevel.CRITICAL
    if threshold.critical_high is not None and value > threshold.critical_high:
        return AlertLevel.CRITICAL

    if threshold.warning_low is not None and value < threshold.warning_low:
        return AlertLevel.WARNING
    if threshold.warning_high is not None and value > threshold.warning_high:
        return AlertLevel.WARNING

    if threshold.normal_min is not None and value < threshold.normal_min:
        return AlertLevel.WARNING
    if threshold.normal_max is not None and value > threshold.normal_max:
        return AlertLevel.WARNING

    return AlertLevel.NORMAL


def _build_message(threshold: MetricThreshold, value: float, level: AlertLevel) -> str:
    direction = ""
    if threshold.normal_min is not None and value < threshold.normal_min:
        direction = "ниже нормы"
    elif threshold.normal_max is not None and value > threshold.normal_max:
        direction = "выше нормы"
    prefix = "Критическое отклонение" if level == AlertLevel.CRITICAL else "Отклонение"
    return f"{prefix}: {threshold.label} {value:g} {threshold.unit} ({direction or 'вне нормы'})"


def evaluate_metrics(
    metrics: Dict[str, Any],
    threshold_map: Optional[Dict[str, MetricThreshold]] = None,
) -> List[VitalAlert]:
    alerts: List[VitalAlert] = []
    seen: set[str] = set()
    thresholds = threshold_map or BRACELET_THRESHOLDS

    for raw_key, raw_value in metrics.items():
        canonical = METRIC_ALIASES.get(raw_key.lower(), raw_key.lower())
        if canonical in seen:
            continue
        threshold = thresholds.get(canonical) or BRACELET_THRESHOLDS.get(canonical)
        if not threshold:
            continue

        value = _to_float(raw_value)
        if value is None:
            continue

        level = _evaluate_value(threshold, value)
        if level == AlertLevel.NORMAL:
            continue

        seen.add(canonical)
        alerts.append(
            VitalAlert(
                metric=canonical,
                label=threshold.label,
                value=value,
                unit=threshold.unit,
                level=level,
                message=_build_message(threshold, value, level),
                normal_range=_format_range(threshold),
            )
        )

    return alerts


def normalize_bracelet_metrics(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Единый ключ pulse из hr/pulse_rate."""
    result = dict(metrics)
    if result.get("pulse") is None:
        for alt in ("hr", "pulse_rate"):
            if result.get(alt) is not None:
                result["pulse"] = result[alt]
                break
    return result
