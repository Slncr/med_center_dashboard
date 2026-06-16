import React, { useMemo, useState } from 'react';
import { useBraceletOverview } from '../../hooks/useBraceletOverview';
import LoadingSpinner from '../common/LoadingSpinner';
import BraceletAlertsToolbar from './BraceletAlertsToolbar';
import PatientBraceletCard from './PatientBraceletCard';
import UnassignedBraceletsBar from './UnassignedBraceletsBar';
import './BraceletAlertsPanel.css';

type FilterMode = 'all' | 'alerts' | 'no_mac';

const BraceletAlertsPanel: React.FC = () => {
  const { overview, loading, checking, error, refetch, runCheckAndNotify, testMaxBot } =
    useBraceletOverview(true);
  const [filter, setFilter] = useState<FilterMode>('all');

  const patients = useMemo(() => {
    const list = overview?.patients ?? [];
    switch (filter) {
      case 'alerts':
        return list.filter((p) => p.alerts.length > 0);
      case 'no_mac':
        return list.filter((p) => !p.ble_mac);
      default:
        return list;
    }
  }, [overview?.patients, filter]);

  const handleTestMax = async () => {
    try {
      await testMaxBot();
      window.alert('Тестовое сообщение отправлено в MAX');
    } catch {
      /* error in hook state */
    }
  };

  if (loading && !overview) {
    return (
      <div className="bracelet-panel loading">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bracelet-panel">
      <div className="bracelet-panel__intro">
        <h2>Мониторинг браслетов</h2>
        <p>
          Показатели с BLE-браслетов проверяются каждую минуту. При отклонении пульса или SpO₂
          отправляется оповещение в чат MAX (повтор — не чаще 15 минут на тот же показатель).
          На карточке пациента нажмите «Настроить пороги» и включите чекбокс «Свои пороги».
        </p>
        <p className="bracelet-panel__norms-hint">
          Стандартные пороги: пульс, SpO₂, температура, дыхание, давление, вариабельность ЧСС,
          стресс, сон, батарея. Для каждого пациента можно задать свои в «Настроить пороги».
        </p>
      </div>

      <BraceletAlertsToolbar
        overview={overview}
        loading={loading}
        checking={checking}
        onRefresh={refetch}
        onCheckNow={runCheckAndNotify}
        onTestMax={handleTestMax}
      />

      <UnassignedBraceletsBar overview={overview} onDistributed={refetch} />

      {error && <div className="bracelet-panel__error">{error}</div>}
      {overview?.error && (
        <div className="bracelet-panel__error">Сервер мониторинга: {overview.error}</div>
      )}

      <div className="bracelet-panel__filters">
        <button
          type="button"
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Все ({overview?.patients.length ?? 0})
        </button>
        <button
          type="button"
          className={filter === 'alerts' ? 'active' : ''}
          onClick={() => setFilter('alerts')}
        >
          С отклонениями
        </button>
        <button
          type="button"
          className={filter === 'no_mac' ? 'active' : ''}
          onClick={() => setFilter('no_mac')}
        >
          Без MAC
        </button>
      </div>

      <div className="bracelet-panel__grid">
        {patients.map((patient) => (
          <PatientBraceletCard
            key={patient.patient_id}
            patient={patient}
            onChanged={refetch}
          />
        ))}
      </div>

      {patients.length === 0 && (
        <p className="bracelet-panel__empty">Нет пациентов по выбранному фильтру</p>
      )}
    </div>
  );
};

export default BraceletAlertsPanel;
