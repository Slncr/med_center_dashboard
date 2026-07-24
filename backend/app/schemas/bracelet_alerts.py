"""API-схемы мониторинга браслетов."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class VitalAlertView(BaseModel):
    metric: str
    label: str
    value: float
    unit: str
    level: str
    message: str
    normal_range: str


class MetricThresholdValues(BaseModel):
    label: str
    unit: str
    normal_min: Optional[float] = None
    normal_max: Optional[float] = None
    warning_low: Optional[float] = None
    warning_high: Optional[float] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None


class MetricThresholdOverrideInput(BaseModel):
    normal_min: Optional[float] = None
    normal_max: Optional[float] = None
    warning_low: Optional[float] = None
    warning_high: Optional[float] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None


class PatientVitalThresholdsUpdate(BaseModel):
    """Произвольный набор канонических показателей (pulse, spo2, temp, …)."""
    pulse: Optional[MetricThresholdOverrideInput] = None
    spo2: Optional[MetricThresholdOverrideInput] = None
    temp: Optional[MetricThresholdOverrideInput] = None
    respiration: Optional[MetricThresholdOverrideInput] = None
    press: Optional[MetricThresholdOverrideInput] = None
    hrv: Optional[MetricThresholdOverrideInput] = None
    stress: Optional[MetricThresholdOverrideInput] = None
    sleep: Optional[MetricThresholdOverrideInput] = None
    battery: Optional[MetricThresholdOverrideInput] = None


class PatientVitalThresholdsResponse(BaseModel):
    patient_id: int
    has_custom: bool
    defaults: Dict[str, MetricThresholdValues]
    overrides: Optional[Dict[str, Dict[str, float]]] = None
    effective: Dict[str, MetricThresholdValues]


class PatientBraceletView(BaseModel):
    patient_id: int
    patient_name: str
    ble_mac: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    admission_date: Optional[str] = None
    online: Optional[bool] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    alerts: List[VitalAlertView] = Field(default_factory=list)
    has_custom_thresholds: bool = False


class UnassignedBleDeviceView(BaseModel):
    mac: str
    online: Optional[bool] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class BraceletAssignmentPair(BaseModel):
    patient_id: int
    patient_name: str
    ble_mac: str
    room_number: Optional[str] = None
    bed_number: Optional[str] = None


class AssignBraceletRequest(BaseModel):
    patient_id: int
    ble_mac: str


class AssignBraceletResponse(BaseModel):
    pair: BraceletAssignmentPair
    monitoring_connected: bool
    message: str
    error: Optional[str] = None


class UnassignBraceletResponse(BaseModel):
    patient_id: int
    patient_name: str
    ble_mac: str
    message: str


class DistributeBraceletsResponse(BaseModel):
    assigned_count: int
    pairs: List[BraceletAssignmentPair] = Field(default_factory=list)
    patients_without_mac_remaining: int
    unassigned_devices_remaining: List[str] = Field(default_factory=list)
    monitoring_connected: bool
    message: str
    error: Optional[str] = None


class BraceletOverviewResponse(BaseModel):
    checked_at: str
    patients_total: int
    patients_with_ble: int
    patients_online: int
    patients_without_mac: int = 0
    alerts_found: int
    monitoring_connected: bool
    max_bot_configured: bool
    alerts_enabled: bool
    error: Optional[str] = None
    patients: List[PatientBraceletView] = Field(default_factory=list)
    unassigned_devices: List[UnassignedBleDeviceView] = Field(default_factory=list)


class BraceletCheckResponse(BaseModel):
    checked_at: str
    alerts_found: int
    alerts_sent: int
    alerts_skipped_dedup: int
    monitoring_connected: bool
    message: str
