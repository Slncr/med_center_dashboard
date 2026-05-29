import type { VitalAlertLevel } from '../types/braceletAlerts';

/** Канонические ключи показателей браслета (совпадают с бэкендом). */
export const BRACELET_DISPLAY_METRICS = [
  'pulse',
  'spo2',
  'temp',
  'respiration',
  'press',
  'hrv',
  'stress',
  'sleep',
  'battery',
] as const;

export const BRACELET_METRIC_LABELS: Record<string, string> = {
  pulse: 'Пульс',
  hr: 'Пульс',
  bpm: 'Пульс',
  spo2: 'SpO₂',
  sp_o2: 'SpO₂',
  oxygen: 'SpO₂',
  temp: 'Температура',
  respiration: 'Дыхание',
  rr: 'Дыхание',
  press: 'Давление',
  bp: 'Давление',
  hrv: 'Вариабельность ЧСС',
  stress: 'Стресс',
  sleep: 'Сон',
  battery: 'Батарея',
};

const ALIAS_TO_CANONICAL: Record<string, string> = {
  hr: 'pulse',
  bpm: 'pulse',
  pulse_rate: 'pulse',
  puls: 'pulse',
  sp_o2: 'spo2',
  oxygen: 'spo2',
  rr: 'respiration',
  resp: 'respiration',
  bp: 'press',
};

const SKIP_METRICS = new Set(['steps', 'wear', 'rssi', 'online', 'mac', 'id']);

export function canonicalMetricKey(rawKey: string): string {
  const key = rawKey.trim().toLowerCase();
  return ALIAS_TO_CANONICAL[key] ?? key;
}

export function getMetricLabel(key: string): string {
  const canonical = canonicalMetricKey(key);
  return BRACELET_METRIC_LABELS[canonical] ?? BRACELET_METRIC_LABELS[key] ?? key;
}

export function formatMetricValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const c = canonicalMetricKey(key);
  if (c === 'temp') return `${n.toFixed(1)} °C`;
  if (c === 'spo2' || c === 'battery') return `${Math.round(n)}%`;
  if (c === 'pulse' || c === 'respiration') return `${Math.round(n)}`;
  if (c === 'press') return `${Math.round(n)}`;
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

export function levelLabel(level: VitalAlertLevel): string {
  switch (level) {
    case 'critical':
      return 'Критично';
    case 'warning':
      return 'Внимание';
    default:
      return 'Норма';
  }
}

export function levelClassName(level: VitalAlertLevel): string {
  return `vital-level--${level}`;
}

/** Метрики для отображения на карточке (без служебных). */
export function displayMetrics(
  metrics: Record<string, unknown>,
): Array<{ key: string; canonical: string; label: string; value: string }> {
  const seen = new Set<string>();
  const rows: Array<{ key: string; canonical: string; label: string; value: string }> = [];

  Object.entries(metrics).forEach(([rawKey, rawValue]) => {
    const canonical = canonicalMetricKey(rawKey);
    if (SKIP_METRICS.has(canonical)) return;
    if (seen.has(canonical)) return;
    if (rawValue === null || rawValue === undefined) return;
    seen.add(canonical);
    rows.push({
      key: rawKey,
      canonical,
      label: getMetricLabel(rawKey),
      value: formatMetricValue(rawKey, rawValue),
    });
  });

  const order = [...BRACELET_DISPLAY_METRICS];
  return rows.sort(
    (a, b) =>
      (order.indexOf(a.canonical as (typeof order)[number]) + 1 || 99) -
      (order.indexOf(b.canonical as (typeof order)[number]) + 1 || 99),
  );
}

export function alertLevelForMetric(
  alerts: Array<{ metric: string; level: VitalAlertLevel }>,
  canonical: string,
): VitalAlertLevel {
  const found = alerts.find((a) => canonicalMetricKey(a.metric) === canonical);
  return found?.level ?? 'normal';
}
