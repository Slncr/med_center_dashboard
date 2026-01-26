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