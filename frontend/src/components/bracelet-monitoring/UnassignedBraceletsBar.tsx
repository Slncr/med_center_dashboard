import React, { useMemo, useState } from 'react';
import type { BraceletOverview, DistributeBraceletsResult } from '../../types/braceletAlerts';
import { apiService } from '../../services/api';
import UnassignedBraceletRow from './UnassignedBraceletRow';
import './UnassignedBraceletsBar.css';

interface UnassignedBraceletsBarProps {
  overview: BraceletOverview | null;
  onDistributed: () => void;
}

const UnassignedBraceletsBar: React.FC<UnassignedBraceletsBarProps> = ({
  overview,
  onDistributed,
}) => {
  const [distributing, setDistributing] = useState(false);
  const [lastResult, setLastResult] = useState<DistributeBraceletsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patientsWithoutMac = useMemo(
    () => (overview?.patients ?? []).filter((p) => !p.ble_mac),
    [overview?.patients],
  );

  if (!overview) return null;

  const unassigned = overview.unassigned_devices ?? [];
  const withoutMacCount = patientsWithoutMac.length;

  if (unassigned.length === 0 && withoutMacCount === 0 && !lastResult) {
    return null;
  }

  const canAutoDistribute = unassigned.length > 0 && withoutMacCount > 0;

  const handleDistribute = async () => {
    if (!canAutoDistribute) return;
    if (
      !window.confirm(
        `Привязать ${Math.min(unassigned.length, withoutMacCount)} браслет(ов) автоматически? ` +
          'Порядок: по палате и койке.',
      )
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

  const handleAssigned = () => {
    setLastResult(null);
    onDistributed();
  };

  return (
    <section className="unassigned-bracelets-bar">
      <div className="unassigned-bracelets-bar__header">
        <div>
          <h3>Свободные браслеты</h3>
          <p>
            Выберите пациента для каждого браслета или привяжите все сразу. Свободных:{' '}
            <strong>{unassigned.length}</strong> · пациентов без MAC:{' '}
            <strong>{withoutMacCount}</strong>
          </p>
        </div>
        <button
          type="button"
          className="unassigned-bracelets-bar__distribute"
          disabled={!canAutoDistribute || distributing}
          onClick={() => void handleDistribute()}
        >
          {distributing
            ? 'Привязка…'
            : canAutoDistribute
              ? `Привязать все (${Math.min(unassigned.length, withoutMacCount)})`
              : 'Авто: нечего'}
        </button>
      </div>

      {error && <div className="unassigned-bracelets-bar__error">{error}</div>}

      {lastResult && lastResult.assigned_count > 0 && (
        <div className="unassigned-bracelets-bar__success">
          {lastResult.message}
          <ul>
            {lastResult.pairs.map((pair) => (
              <li key={pair.patient_id}>
                {pair.patient_name}
                {pair.room_number ? ` (палата ${pair.room_number}` : ''}
                {pair.bed_number ? `, койка ${pair.bed_number})` : pair.room_number ? ')' : ''}
                {' → '}
                <code>{pair.ble_mac}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="unassigned-bracelets-bar__list">
          {unassigned.map((device) => (
            <UnassignedBraceletRow
              key={device.mac}
              device={device}
              patientsWithoutMac={patientsWithoutMac}
              onAssigned={handleAssigned}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default UnassignedBraceletsBar;
