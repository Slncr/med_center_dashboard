export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MSK_OPTIONS: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Moscow' };

/** Дата и время по Москве (для меток с сервера в UTC/MSK). */
export const formatMoscowDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString('ru-RU', MSK_OPTIONS);

export const formatMoscowTime = (date: string | Date): string =>
  new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    ...MSK_OPTIONS,
  });

export const formatBloodPressure = (systolic?: number, diastolic?: number): string => {
  if (!systolic || !diastolic) return '—';
  return `${systolic}/${diastolic}`;
};

export const formatPatientName = (name: string): string => {
  // Форматирование ФИО для отображения
  const parts = name.split(' ');
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
  }
  return name;
};

export const formatRoomNumber = (room: string): string => {
  return `Палата ${room}`;
};

export const formatBedNumber = (bed: number): string => {
  return `Койка ${bed}`;
};

export const formatTemperature = (temp?: number): string => {
  return temp ? `${temp.toFixed(1)}°C` : '—';
};

/** ACTIVE / active / DISCHARGED / discharged → active | discharged */
export const normalizePatientStatus = (status?: string | null): 'active' | 'discharged' => {
  const s = String(status ?? '').toLowerCase();
  return s === 'active' ? 'active' : 'discharged';
};

export const formatPatientStatusLabel = (status?: string | null): string =>
  normalizePatientStatus(status) === 'active' ? 'Активный' : 'Выписан';

export const isPatientActive = (status?: string | null): boolean =>
  normalizePatientStatus(status) === 'active';

/** Статус назначения (ACTIVE / COMPLETED / CANCELLED) → по-русски */
export const getPrescriptionStatusLabel = (status?: string | null): string => {
  switch (String(status ?? '').toUpperCase()) {
    case 'ACTIVE':
      return 'Активно';
    case 'COMPLETED':
      return 'Выполнено';
    case 'CANCELLED':
      return 'Отменено';
    default:
      return '—';
  }
};

/** Статус процедуры → по-русски */
export const getProcedureStatusLabel = (status?: string | null): string => {
  switch (String(status ?? '').toUpperCase()) {
    case 'SCHEDULED':
      return 'Запланировано';
    case 'IN_PROGRESS':
      return 'Выполняется';
    case 'COMPLETED':
      return 'Выполнено';
    case 'CANCELLED':
      return 'Отменено';
    default:
      return '—';
  }
};