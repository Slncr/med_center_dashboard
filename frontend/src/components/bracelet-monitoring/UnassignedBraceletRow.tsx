import React, { useMemo, useState } from 'react';
import type { PatientBraceletStatus, UnassignedBleDevice } from '../../types/braceletAlerts';
import { apiService } from '../../services/api';
import { displayMetrics } from '../../utils/braceletVitals';
import './UnassignedBraceletRow.css';

interface UnassignedBraceletRowProps {
  device: UnassignedBleDevice;
  patientsWithoutMac: PatientBraceletStatus[];
  onAssigned: () => void;
}

function patientOptionLabel(p: PatientBraceletStatus): string {
  const parts = [p.patient_name];
  if (p.room_number) parts.push(`пал. ${p.room_number}`);
  if (p.bed_number) parts.push(`койка ${p.bed_number}`);
  return parts.join(' · ');
}

const UnassignedBraceletRow: React.FC<UnassignedBraceletRowProps> = ({
  device,
  patientsWithoutMac,
  onAssigned,
}) => {
  const [patientId, setPatientId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const sortedPatients = useMemo(
    () =>
      [...patientsWithoutMac].sort((a, b) => {
        const roomA = a.room_number ?? 'zzz';
        const roomB = b.room_number ?? 'zzz';
        if (roomA !== roomB) return roomA.localeCompare(roomB, 'ru');
        const bedA = a.bed_number ?? 'zzz';
        const bedB = b.bed_number ?? 'zzz';
        return bedA.localeCompare(bedB, 'ru');
      }),
    [patientsWithoutMac],
  );

  const metricRows = displayMetrics(device.metrics ?? {});
  const canAssign = Boolean(patientId) && sortedPatients.length > 0;

  const handleAssign = async () => {
    if (!canAssign) return;
    setAssigning(true);
    setRowError(null);
    try {
      await apiService.assignBracelet(Number(patientId), device.mac);
      setPatientId('');
      onAssigned();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Ошибка привязки');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="unassigned-bracelet-row">
      <div className="unassigned-bracelet-row__info">
        <code>{device.mac}</code>
        <span className={`unassigned-bracelet-row__online ${device.online ? 'on' : 'off'}`}>
          {device.online ? 'онлайн' : 'офлайн'}
        </span>
        {metricRows.length > 0 && (
          <span className="unassigned-bracelet-row__metrics">
            {metricRows
              .slice(0, 3)
              .map((r) => `${r.label}: ${r.value}`)
              .join(' · ')}
          </span>
        )}
      </div>

      <div className="unassigned-bracelet-row__assign">
        {sortedPatients.length === 0 ? (
          <span className="unassigned-bracelet-row__hint">Нет пациентов без браслета</span>
        ) : (
          <>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              aria-label={`Пациент для браслета ${device.mac}`}
            >
              <option value="">Выберите пациента…</option>
              {sortedPatients.map((p) => (
                <option key={p.patient_id} value={String(p.patient_id)}>
                  {patientOptionLabel(p)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!canAssign || assigning}
              onClick={() => void handleAssign()}
            >
              {assigning ? '…' : 'Привязать'}
            </button>
          </>
        )}
      </div>

      {rowError && <p className="unassigned-bracelet-row__error">{rowError}</p>}
    </div>
  );
};

export default UnassignedBraceletRow;
