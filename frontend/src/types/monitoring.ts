export interface MonitoringHealth {
  ok: boolean;
  updated_at?: string;
  device_count?: number;
  error?: string;
}

export interface BleDeviceView {
  mac: string;
  online?: boolean | null;
  metrics: Record<string, string | number | boolean | null>;
  updated_at?: string | null;
}

export interface AtmosphereView {
  zone?: number | null;
  temp?: number | null;
  hum?: number | null;
  press?: number | null;
  co2?: number | null;
}

export interface BedMonitoringView {
  bed_id: number;
  bed_number: string;
  patient_id?: number | null;
  patient_name?: string | null;
  ble_mac?: string | null;
  ble?: BleDeviceView | null;
}

export interface MonitoringDashboard {
  connected: boolean;
  error?: string | null;
  health: MonitoringHealth;
  room_id: number;
  monitor_zone?: number | null;
  available_atm_zones?: number[];
  atmosphere_error?: string | null;
  atmosphere?: AtmosphereView | null;
  beds: BedMonitoringView[];
  unassigned_ble: BleDeviceView[];
  refreshed_at?: string | null;
  sensors_updated_at?: string | null;
}
