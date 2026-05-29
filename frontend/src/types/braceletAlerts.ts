export type VitalAlertLevel = 'normal' | 'warning' | 'critical';

export interface VitalAlert {
  metric: string;
  label: string;
  value: number;
  unit: string;
  level: VitalAlertLevel;
  message: string;
  normal_range: string;
}

export interface MetricThresholdValues {
  label: string;
  unit: string;
  normal_min?: number | null;
  normal_max?: number | null;
  warning_low?: number | null;
  warning_high?: number | null;
  critical_low?: number | null;
  critical_high?: number | null;
}

export interface PatientVitalThresholds {
  patient_id: number;
  has_custom: boolean;
  defaults: Record<string, MetricThresholdValues>;
  overrides: Record<string, Record<string, number>> | null;
  effective: Record<string, MetricThresholdValues>;
}

export interface PatientBraceletStatus {
  patient_id: number;
  patient_name: string;
  ble_mac?: string | null;
  room_number?: string | null;
  bed_number?: string | null;
  online?: boolean | null;
  metrics: Record<string, number | string | boolean | null>;
  alerts: VitalAlert[];
  has_custom_thresholds?: boolean;
}

export interface BraceletOverview {
  checked_at: string;
  patients_total: number;
  patients_with_ble: number;
  patients_online: number;
  alerts_found: number;
  monitoring_connected: boolean;
  max_bot_configured: boolean;
  alerts_enabled: boolean;
  error?: string | null;
  patients: PatientBraceletStatus[];
}

export interface BraceletCheckResult {
  checked_at: string;
  alerts_found: number;
  alerts_sent: number;
  alerts_skipped_dedup: number;
  monitoring_connected: boolean;
  message: string;
}
