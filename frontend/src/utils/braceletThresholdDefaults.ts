import type { MetricThresholdValues, PatientVitalThresholds } from '../types/braceletAlerts';

export const EMPTY_METRIC_OVERRIDE = {
  normal_min: '',
  normal_max: '',
  warning_low: '',
  warning_high: '',
  critical_low: '',
  critical_high: '',
};

export type MetricOverrideForm = typeof EMPTY_METRIC_OVERRIDE;

const THRESHOLD_FIELDS = [
  'normal_min',
  'normal_max',
  'warning_low',
  'warning_high',
  'critical_low',
  'critical_high',
] as const satisfies ReadonlyArray<keyof MetricOverrideForm>;

export function metricHasCustomEffective(
  defaults: MetricThresholdValues,
  effective: MetricThresholdValues,
): boolean {
  return THRESHOLD_FIELDS.some((field) => (defaults[field] ?? null) !== (effective[field] ?? null));
}

export function overridesToForms(
  defaults: Record<string, MetricThresholdValues>,
  overrides?: PatientVitalThresholds['overrides'],
): Record<string, MetricOverrideForm> {
  const toForm = (block?: Record<string, number>) => ({
    normal_min: block?.normal_min != null ? String(block.normal_min) : '',
    normal_max: block?.normal_max != null ? String(block.normal_max) : '',
    warning_low: block?.warning_low != null ? String(block.warning_low) : '',
    warning_high: block?.warning_high != null ? String(block.warning_high) : '',
    critical_low: block?.critical_low != null ? String(block.critical_low) : '',
    critical_high: block?.critical_high != null ? String(block.critical_high) : '',
  });

  const result: Record<string, MetricOverrideForm> = {};
  Object.keys(defaults).forEach((key) => {
    result[key] = toForm(overrides?.[key]);
  });
  return result;
}

export function enabledFlagsFromOverrides(
  defaults: Record<string, MetricThresholdValues>,
  overrides?: PatientVitalThresholds['overrides'],
  effective?: Record<string, MetricThresholdValues>,
): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  Object.keys(defaults).forEach((key) => {
    const hasOverride = Boolean(overrides?.[key] && Object.keys(overrides[key]).length > 0);
    const hasEffectiveDiff = effective?.[key]
      ? metricHasCustomEffective(defaults[key], effective[key])
      : false;
    flags[key] = hasOverride || hasEffectiveDiff;
  });
  return flags;
}

export function formToOverridesPayload(
  defaults: Record<string, MetricThresholdValues>,
  forms: Record<string, MetricOverrideForm>,
  enabled: Record<string, boolean>,
): PatientVitalThresholds['overrides'] {
  const parseBlock = (form: MetricOverrideForm) => {
    const block: Record<string, number> = {};
    (Object.keys(EMPTY_METRIC_OVERRIDE) as (keyof MetricOverrideForm)[]).forEach((key) => {
      const raw = form[key].trim();
      if (raw !== '') {
        block[key] = Number(raw);
      }
    });
    return Object.keys(block).length > 0 ? block : undefined;
  };

  const result: NonNullable<PatientVitalThresholds['overrides']> = {};
  Object.keys(defaults).forEach((metricKey) => {
    if (!enabled[metricKey]) return;
    const block = parseBlock(forms[metricKey] ?? { ...EMPTY_METRIC_OVERRIDE });
    if (block) result[metricKey] = block;
  });
  return Object.keys(result).length > 0 ? result : null;
}

export function formatThresholdSummary(t: MetricThresholdValues): string {
  if (t.normal_min != null && t.normal_max != null) {
    return `${t.normal_min}–${t.normal_max} ${t.unit}`;
  }
  if (t.normal_min != null) {
    return `≥${t.normal_min} ${t.unit}`;
  }
  if (t.normal_max != null) {
    return `≤${t.normal_max} ${t.unit}`;
  }
  return '—';
}
