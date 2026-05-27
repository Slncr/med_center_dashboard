import { WebSocketMessage } from '../hooks/useWebSocket';

export interface PrescriptionNotificationPayload {
  patientId: number;
  patientName: string;
  count: number;
  prescriptionIds: number[];
}

type ShowFn = (payload: PrescriptionNotificationPayload) => void;

const pending = new Map<
  number,
  {
    count: number;
    prescriptionIds: number[];
    patientName: string;
    timer: ReturnType<typeof setTimeout>;
  }
>();

const DEBOUNCE_MS = 700;

/** Склеивает несколько prescription_created в одно уведомление (fallback для старого API). */
export function queuePrescriptionNotification(message: WebSocketMessage, show: ShowFn): void {
  const patientId = message.patient_id as number;
  if (!patientId) return;

  const existing = pending.get(patientId);
  const count = (existing?.count ?? 0) + 1;
  const prescriptionIds = [
    ...(existing?.prescriptionIds ?? []),
    ...(message.prescription_id ? [message.prescription_id as number] : []),
  ];
  const patientName =
    (message.patient_name as string) ||
    existing?.patientName ||
    `пациент #${patientId}`;

  if (existing?.timer) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    pending.delete(patientId);
    show({ patientId, patientName, count, prescriptionIds });
  }, DEBOUNCE_MS);

  pending.set(patientId, { count, prescriptionIds, patientName, timer });
}

export function showBatchPrescriptionNotification(
  message: WebSocketMessage,
  show: ShowFn,
): void {
  const patientId = message.patient_id as number;
  if (!patientId) return;

  const pendingEntry = pending.get(patientId);
  if (pendingEntry?.timer) {
    clearTimeout(pendingEntry.timer);
    pending.delete(patientId);
  }

  show({
    patientId,
    patientName: (message.patient_name as string) || `пациент #${patientId}`,
    count: (message.count as number) || (message.prescription_ids as number[])?.length || 1,
    prescriptionIds: (message.prescription_ids as number[]) || [],
  });
}
