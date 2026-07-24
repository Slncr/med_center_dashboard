import React, { useMemo, useState } from 'react';
import { useBraceletOverview } from '../../hooks/useBraceletOverview';
import LoadingSpinner from '../common/LoadingSpinner';
import BraceletAlertsToolbar from './BraceletAlertsToolbar';
import PatientBraceletCard from './PatientBraceletCard';
import UnassignedBraceletsBar from './UnassignedBraceletsBar';
import { appAlert } from '../../context/AppDialogContext';
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
      await appAlert('Тестовое сообщение отправлено в MAX');
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
      <header className="bracelet-panel__hero">
        <div className="bracelet-panel__hero-text">
          <h2 className="bracelet-panel__title">Мониторинг браслетов</h2>
          <p className="bracelet-panel__subtitle">
            Показатели с BLE-браслетов проверяются каждую минуту. При отклонении пульса или SpO₂
            отправляется оповещение в чат MAX (повтор — не чаще 15 минут на тот же показатель…
            <span className="bracelet-panel__chevron" aria-hidden="true">
              ▾
            </span>
          </p>
        </div>
      </header>

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
          className={`bracelet-filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button
          type="button"
          className={`bracelet-filter-tab ${filter === 'alerts' ? 'active' : ''}`}
          onClick={() => setFilter('alerts')}
        >
          С отклонениями
        </button>
        <button
          type="button"
          className={`bracelet-filter-tab ${filter === 'no_mac' ? 'active' : ''}`}
          onClick={() => setFilter('no_mac')}
        >
          Без MAX
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
