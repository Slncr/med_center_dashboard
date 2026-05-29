import { Prescription, PrescriptionPackage } from '../types';

import { formatMoscowDate, formatMoscowTime } from './formatters';

export const formatPackageTitle = (pkg: PrescriptionPackage): string => {
  return `Назначение от ${formatMoscowDate(pkg.created_at)} ${formatMoscowTime(pkg.created_at)}`;
};

export const packageStatusLabel = (pkg: PrescriptionPackage): string =>
  pkg.status === 'COMPLETED' ? 'Выполнено' : 'Не выполнено';

export const prescriptionProgress = (p: Prescription): string => {
  const req = p.executions_required ?? 1;
  const done = p.executions_done ?? 0;
  if (p.status === 'COMPLETED') return `${req}/${req}`;
  return `${done}/${req}`;
};

export const filterWorkItems = (
  prescriptions: Prescription[],
  type: 'PROCEDURE' | 'MEASUREMENT',
): Prescription[] =>
  prescriptions.filter(
    (p) => p.prescription_type === type && p.status !== 'CANCELLED',
  );
