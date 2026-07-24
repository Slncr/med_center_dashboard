export const METRIC_LABELS: Record<string, string> = {
  temp: 'Температура',
  hum: 'Влажность',
  press: 'Арт. давление',
  co2: 'CO₂',
  pulse: 'Пульс',
  puls: 'Пульс',
  pulse_rate: 'Пульс',
  bpm: 'Пульс',
  hr: 'ЧСС',
  hrv: 'Вариабельность ЧСС',
  sleep: 'Сон',
  stress: 'Стресс',
  bp: 'Арт. давление',
  spo2: 'SpO₂',
  sp_o2: 'SpO₂',
  oxygen: 'Кислород',
  respiration: 'Дыхание',
  rr: 'Дыхание',
  battery: 'Батарея',
  rssi: 'Уровень сигнала',
};

export const ATM_ICONS: Record<string, string> = {
  temp: '🌡️',
  hum: '💧',
  press: '📊',
  co2: '🌬️',
};

const HIDDEN_BLE_KEYS = new Set(['steps', 'wear', 'battery', 'rssi']);

export const normalizeMetricKey = (rawKey: string): string => rawKey.trim().toLowerCase();

export const unwrapMetric = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'value' in (value as object)) {
    return (value as { value: unknown }).value;
  }
  return value;
};

export const formatMetricValue = (key: string, value: unknown): string => {
  const v = unwrapMetric(value);
  const normalizedKey = normalizeMetricKey(key);
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  if (normalizedKey === 'bp') return String(v);
  if (typeof v === 'number') {
    if (normalizedKey === 'temp') return `${v.toFixed(1)} °C`;
    if (normalizedKey === 'hum') return `${Math.round(v)} %`;
    if (normalizedKey === 'press') return `${Math.round(v)} мм`;
    if (normalizedKey === 'co2') return `${Math.round(v)} ppm`;
    return Number.isInteger(v) ? `${v}` : v.toFixed(1);
  }
  return String(v);
};

export const getMetricLabel = (rawKey: string): string => {
  const key = normalizeMetricKey(rawKey);
  if (METRIC_LABELS[key]) return METRIC_LABELS[key];
  return rawKey.replace(/_/g, ' ');
};

export const filterBleMetricEntries = (
  metrics: Record<string, string | number | boolean | null>,
): [string, string | number | boolean | null][] =>
  Object.entries(metrics)
    .filter(([key]) => !HIDDEN_BLE_KEYS.has(normalizeMetricKey(key)))
    .sort(([a], [b]) => getMetricLabel(a).localeCompare(getMetricLabel(b), 'ru'));
