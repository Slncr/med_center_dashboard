"""Внутренние типы модуля оповещений."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.bracelet_alerts.thresholds import AlertLevel


@dataclass
class VitalAlert:
    metric: str
    label: str
    value: float
    unit: str
    level: AlertLevel
    message: str
    normal_range: str


@dataclass
class PatientBraceletSnapshot:
    patient_id: int
    patient_name: str
    ble_mac: Optional[str]
    room_number: Optional[str]
    bed_number: Optional[str]
    online: Optional[bool]
    metrics: Dict[str, Any] = field(default_factory=dict)
    alerts: List[VitalAlert] = field(default_factory=list)
    has_custom_thresholds: bool = False


@dataclass
class CheckResult:
    checked_at: str
    patients_total: int
    patients_with_ble: int
    patients_online: int
    alerts_found: int
    alerts_sent: int
    alerts_skipped_dedup: int
    monitoring_connected: bool
    error: Optional[str] = None
    snapshots: List[PatientBraceletSnapshot] = field(default_factory=list)
