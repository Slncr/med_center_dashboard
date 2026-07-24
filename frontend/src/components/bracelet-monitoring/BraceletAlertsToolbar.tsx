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

  const monitorLabel = overview?.monitoring_connected ? 'подключён' : 'недоступен';

  return (
    <section className="bracelet-summary">
      <div className="bracelet-toolbar">
        <div className="bracelet-toolbar__stats">
          <div className="bracelet-stat-card">
            <span className="bracelet-stat-card__label">Пациентов:</span>
            <span className="bracelet-stat-card__value">{overview?.patients_total ?? 0}</span>
          </div>
          <div className="bracelet-stat-card">
            <span className="bracelet-stat-card__label">С браслетом:</span>
            <span className="bracelet-stat-card__value">{overview?.patients_with_ble ?? 0}</span>
          </div>
          <div className="bracelet-stat-card">
            <span className="bracelet-stat-card__label">Онлайн:</span>
            <span className="bracelet-stat-card__value">{overview?.patients_online ?? 0}</span>
          </div>
          <div className="bracelet-stat-card">
            <span className="bracelet-stat-card__label">Отклонений:</span>
            <span className="bracelet-stat-card__value">{overview?.alerts_found ?? 0}</span>
          </div>
        </div>

        <div className="bracelet-toolbar__side">
          <p className="bracelet-toolbar__meta">Обновлено: {checkedAt}</p>
          <p className="bracelet-toolbar__monitor-line">
            Мониторинг: {monitorLabel}
            <span
              className={`bracelet-toolbar__dot ${
                overview?.monitoring_connected ? 'online' : 'offline'
              }`}
            />
          </p>
          {overview && !overview.max_bot_configured && (
            <p className="bracelet-toolbar__warn">
              MAX не настроен (MAX_BOT_TOKEN, MAX_ALERT_CHAT_ID)
            </p>
          )}

          <div className="bracelet-toolbar__actions">
            <button
              type="button"
              className="bracelet-btn bracelet-btn-outline"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? 'Загрузка…' : 'Обновить'}
            </button>
            <button
              type="button"
              className="bracelet-btn bracelet-btn-outline"
              onClick={onCheckNow}
              disabled={checking}
            >
              {checking ? 'Проверка…' : 'Проверить и отправить в MAX'}
            </button>
            <button type="button" className="bracelet-btn bracelet-btn-outline" onClick={onTestMax}>
              Тест MAX
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BraceletAlertsToolbar;
