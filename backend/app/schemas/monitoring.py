from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MonitoringHealth(BaseModel):
    ok: bool
    updated_at: Optional[str] = None
    device_count: Optional[int] = None
    error: Optional[str] = None


class BleDeviceView(BaseModel):
    mac: str
    online: Optional[bool] = None
    metrics: Dict[str, Any] = {}
    updated_at: Optional[str] = None


class AtmosphereView(BaseModel):
    zone: Optional[int] = None
    temp: Optional[float] = None
    hum: Optional[float] = None
    press: Optional[float] = None
    co2: Optional[float] = None


class BedMonitoringView(BaseModel):
    bed_id: int
    bed_number: str
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    ble_mac: Optional[str] = None
    ble: Optional[BleDeviceView] = None


class MonitorZoneUpdate(BaseModel):
    monitor_zone: int


class MonitoringDashboard(BaseModel):
    connected: bool
    error: Optional[str] = None
    health: MonitoringHealth
    room_id: int
    monitor_zone: Optional[int] = None
    available_atm_zones: List[int] = []
    atmosphere_error: Optional[str] = None
    atmosphere: Optional[AtmosphereView] = None
    beds: List[BedMonitoringView] = []
    unassigned_ble: List[BleDeviceView] = []
    refreshed_at: Optional[str] = None  # когда наш API отдал снимок
    sensors_updated_at: Optional[str] = None  # updated_at с сервера мониторинга
