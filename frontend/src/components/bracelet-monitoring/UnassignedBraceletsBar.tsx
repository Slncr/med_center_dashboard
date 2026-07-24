import React, { useMemo, useState } from 'react';
import type { BraceletOverview, DistributeBraceletsResult } from '../../types/braceletAlerts';
import { apiService } from '../../services/api';
import { appConfirm } from '../../context/AppDialogContext';
import './UnassignedBraceletsBar.css';

interface UnassignedBraceletsBarProps {
  overview: BraceletOverview | null;
  onDistributed: () => void;
}

function patientOptionLabel(p: {
  patient_name: string;
  room_number?: string | null;
  bed_number?: string | null;
}): string {
  const parts = [p.patient_name];
  if (p.room_number) parts.push(`пал. ${p.room_number}`);
  if (p.bed_number) parts.push(`койка ${p.bed_number}`);
  return parts.join(' · ');
}

const UnassignedBraceletsBar: React.FC<UnassignedBraceletsBarProps> = ({
  overview,
  onDistributed,
}) => {
  const [patientId, setPatientId] = useState('');
  const [deviceMac, setDeviceMac] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [lastResult, setLastResult] = useState<DistributeBraceletsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patientsWithoutMac = useMemo(
    () => (overview?.patients ?? []).filter((p) => !p.ble_mac),
    [overview?.patients],
  );

  const unassigned = overview?.unassigned_devices ?? [];
  const canAssign = Boolean(patientId && deviceMac);
  const canAutoDistribute = unassigned.length > 0 && patientsWithoutMac.length > 0;

  if (!overview) return null;

  const handleAssign = async () => {
    if (!canAssign) return;
    setAssigning(true);
    setError(null);
    try {
      await apiService.assignBracelet(Number(patientId), deviceMac);
      setPatientId('');
      setDeviceMac('');
      setLastResult(null);
      onDistributed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка привязки');
    } finally {
      setAssigning(false);
    }
  };

  const handleDistribute = async () => {
    if (!canAutoDistribute) return;
    if (
      !(await appConfirm(
        `Привязать ${Math.min(unassigned.length, patientsWithoutMac.length)} браслет(ов) автоматически?`,
      ))
    ) {
      return;
    }
    setDistributing(true);
    setError(null);
    try {
      const result = await apiService.distributeBracelets();
      setLastResult(result);
      onDistributed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка привязки');
    } finally {
      setDistributing(false);
    }
  };

  return (
    <section className="bracelet-assign">
      <div className="bracelet-assign__head">
        <h3 className="bracelet-assign__title">Привязать браслет</h3>
        <span className="bracelet-assign__hint-inline">
          выберите пациента для каждого браслета
          {canAutoDistribute ? (
            <>
              {' '}
              или{' '}
              <button
                type="button"
                className="bracelet-assign__link"
                disabled={distributing}
                onClick={() => void handleDistribute()}
              >
                {distributing ? 'привязка…' : 'привяжите все сразу'}
              </button>
            </>
          ) : (
            ' или привяжите все сразу'
          )}
        </span>
      </div>

      <div className="bracelet-assign__row">
        <select
          className="bracelet-assign__select"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          disabled={patientsWithoutMac.length === 0}
        >
          <option value="">Выберите пациента</option>
          {patientsWithoutMac.map((p) => (
            <option key={p.patient_id} value={String(p.patient_id)}>
              {patientOptionLabel(p)}
            </option>
          ))}
        </select>

        <select
          className="bracelet-assign__select"
          value={deviceMac}
          onChange={(e) => setDeviceMac(e.target.value)}
          disabled={unassigned.length === 0}
        >
          <option value="">Выберите браслет</option>
          {unassigned.map((device) => (
            <option key={device.mac} value={device.mac}>
              {device.mac}
              {device.online ? ' · онлайн' : ' · офлайн'}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="bracelet-btn bracelet-btn-primary"
          disabled={!canAssign || assigning}
          onClick={() => void handleAssign()}
        >
          {assigning ? 'Привязка…' : 'Привязать'}
        </button>
      </div>

      {error && <div className="bracelet-assign__error">{error}</div>}

      {lastResult && lastResult.assigned_count > 0 && (
        <div className="bracelet-assign__success">{lastResult.message}</div>
      )}
    </section>
  );
};

export default UnassignedBraceletsBar;
