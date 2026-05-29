"""Нормы и пороги показателей браслета."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional, Tuple


class AlertLevel(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class MetricThreshold:
    key: str
    label: str
    unit: str
    normal_min: Optional[float]
    normal_max: Optional[float]
    warning_low: Optional[float]
    warning_high: Optional[float]
    critical_low: Optional[float]
    critical_high: Optional[float]


# Канонические ключи (порядок — для UI)
CANONICAL_METRICS: Tuple[str, ...] = (
    "pulse",
    "spo2",
    "temp",
    "respiration",
    "press",
    "hrv",
    "stress",
    "sleep",
    "battery",
)

_DEFAULTS: Dict[str, MetricThreshold] = {
    "pulse": MetricThreshold(
        key="pulse",
        label="Пульс",
        unit="уд/мин",
        normal_min=60,
        normal_max=100,
        warning_low=50,
        warning_high=120,
        critical_low=50,
        critical_high=120,
    ),
    "spo2": MetricThreshold(
        key="spo2",
        label="SpO₂",
        unit="%",
        normal_min=95,
        normal_max=100,
        warning_low=92,
        warning_high=None,
        critical_low=92,
        critical_high=None,
    ),
    "temp": MetricThreshold(
        key="temp",
        label="Температура",
        unit="°C",
        normal_min=36.0,
        normal_max=37.2,
        warning_low=35.5,
        warning_high=37.8,
        critical_low=35.0,
        critical_high=38.5,
    ),
    "respiration": MetricThreshold(
        key="respiration",
        label="Дыхание",
        unit="дых/мин",
        normal_min=12,
        normal_max=20,
        warning_low=10,
        warning_high=25,
        critical_low=8,
        critical_high=30,
    ),
    "press": MetricThreshold(
        key="press",
        label="Давление",
        unit="мм рт.ст.",
        normal_min=90,
        normal_max=140,
        warning_low=85,
        warning_high=160,
        critical_low=80,
        critical_high=180,
    ),
    "hrv": MetricThreshold(
        key="hrv",
        label="Вариабельность ЧСС",
        unit="мс",
        normal_min=20,
        normal_max=200,
        warning_low=15,
        warning_high=None,
        critical_low=10,
        critical_high=None,
    ),
    "stress": MetricThreshold(
        key="stress",
        label="Стресс",
        unit="балл",
        normal_min=None,
        normal_max=50,
        warning_low=None,
        warning_high=70,
        critical_low=None,
        critical_high=85,
    ),
    "sleep": MetricThreshold(
        key="sleep",
        label="Сон",
        unit="балл",
        normal_min=70,
        normal_max=100,
        warning_low=50,
        warning_high=None,
        critical_low=40,
        critical_high=None,
    ),
    "battery": MetricThreshold(
        key="battery",
        label="Батарея",
        unit="%",
        normal_min=20,
        normal_max=100,
        warning_low=15,
        warning_high=None,
        critical_low=10,
        critical_high=None,
    ),
}

METRIC_ALIASES: Dict[str, str] = {
    "hr": "pulse",
    "bpm": "pulse",
    "pulse_rate": "pulse",
    "puls": "pulse",
    "sp_o2": "spo2",
    "oxygen": "spo2",
    "rr": "respiration",
    "resp": "respiration",
    "respiratory_rate": "respiration",
    "bp": "press",
    "blood_pressure": "press",
}

# Для evaluator: канонический ключ + алиасы → один порог
BRACELET_THRESHOLDS: Dict[str, MetricThreshold] = dict(_DEFAULTS)
for alias, canonical in METRIC_ALIASES.items():
    if canonical in _DEFAULTS:
        BRACELET_THRESHOLDS[alias] = _DEFAULTS[canonical]
