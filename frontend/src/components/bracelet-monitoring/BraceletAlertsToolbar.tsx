import React from 'react';
import type { BraceletOverview } from '../../types/braceletAlerts';
import './BraceletAlertsToolbar.css';

interface BraceletAlertsToolbarProps {
  overview: BraceletOverview | null;
  loading: boolean;
  checking: boolean;
  onRefresh: () => void;
  onCheckNow: () => void;
  onTestMax: () => void;
}

const BraceletAlertsToolbar: React.FC<BraceletAlertsToolbarProps> = ({
  overview,
  loading,
  checking,
  onRefresh,
  onCheckNow,
  onTestMax,
}) => {
  const checkedAt = overview?.checked_at
    ? new Date(overview.checked_at).toLocaleString('ru-RU')
    : '—';

  return (
    <div className="bracelet-toolbar">
      <div className="bracelet-toolbar__status">
        <span
          className={`bracelet-toolbar__dot ${
            overview?.monitoring_connected ? 'online' : 'offline'
          }`}
        />
        <span>
          Мониторинг: {overview?.monitoring_connected ? 'подключён' : 'недоступен'}
        </span>
        <span className="bracelet-toolbar__meta">Обновлено: {checkedAt}</span>
        {overview && !overview.max_bot_configured && (
          <span className="bracelet-toolbar__warn">
            MAX не настроен (MAX_BOT_TOKEN, MAX_ALERT_CHAT_ID)
          </span>
        )}
      </div>

      <div className="bracelet-toolbar__stats">
        <span>Пациентов: {overview?.patients_total ?? 0}</span>
        <span>С браслетом: {overview?.patients_with_ble ?? 0}</span>
        <span>Онлайн: {overview?.patients_online ?? 0}</span>
        <span className={overview?.alerts_found ? 'has-alerts' : ''}>
          Отклонений: {overview?.alerts_found ?? 0}
        </span>
      </div>

      <div className="bracelet-toolbar__actions">
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
        <button type="button" onClick={onCheckNow} disabled={checking}>
          {checking ? 'Проверка…' : 'Проверить и отправить в MAX'}
        </button>
        <button type="button" className="secondary" onClick={onTestMax}>
          Тест MAX
        </button>
      </div>
    </div>
  );
};

export default BraceletAlertsToolbar;
