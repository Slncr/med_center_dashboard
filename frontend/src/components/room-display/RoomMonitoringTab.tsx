import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/api';
import { MonitoringDashboard } from '../../types/monitoring';
import './RoomMonitoringTab.css';

const MONITORING_POLL_MS = 3000;

const METRIC_LABELS: Record<string, string> = {
  temp: 'Температура',
  hum: 'Влажность',
  press: 'Давление',
  co2: 'CO₂',
  pulse: 'Пульс',
  hr: 'Пульс',
  spo2: 'SpO₂',
  battery: 'Батарея',
  rssi: 'Сигнал',
};

interface RoomMonitoringTabProps {
  roomId: number | null;
}

const unwrap = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'value' in (value as object)) {
    return (value as { value: unknown }).value;
  }
  return value;
};

const formatMetric = (key: string, value: unknown): string => {
  const v = unwrap(value);
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  if (key === 'temp' && typeof v === 'number') return `${v.toFixed(1)}°`;
  if ((key === 'hum' || key === 'co2') && typeof v === 'number') return `${v}`;
  if (typeof v === 'number') return Number.isInteger(v) ? `${v}` : v.toFixed(1);
  return String(v);
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const RoomMonitoringTab: React.FC<RoomMonitoringTabProps> = ({ roomId }) => {
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const requestSeqRef = useRef(0);
  const hasDataRef = useRef(false);
  const inFlightRef = useRef(false);

  const load = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!roomId) return;
      if (inFlightRef.current && !options?.force) return;

      const silent = options?.silent ?? hasDataRef.current;
      const reqId = ++requestSeqRef.current;
      inFlightRef.current = true;

      if (!silent) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      if (!silent) {
        setError(null);
      }

      try {
        const data = await apiService.getMonitoringDashboard(roomId);
        if (reqId !== requestSeqRef.current) return;

        setDashboard(data);
        hasDataRef.current = true;
        setLastRefreshedAt(new Date());
        if (!data.connected) {
          setError(data.error || 'Сервис мониторинга недоступен');
        } else {
          setError(null);
        }
      } catch (err) {
        if (reqId !== requestSeqRef.current) return;
        const message = err instanceof Error ? err.message : 'Ошибка загрузки мониторинга';
        if (!hasDataRef.current) {
          setDashboard(null);
        }
        setError(message);
      } finally {
        if (reqId === requestSeqRef.current) {
          inFlightRef.current = false;
          setInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [roomId],
  );

  useEffect(() => {
    hasDataRef.current = false;
    setDashboard(null);
    setLastRefreshedAt(null);
    requestSeqRef.current += 1;

    if (!roomId) return undefined;

    void load({ silent: false });
    const interval = setInterval(() => {
      void load({ silent: true });
    }, MONITORING_POLL_MS);

    return () => {
      clearInterval(interval);
      requestSeqRef.current += 1;
    };
  }, [roomId, load]);

  if (!roomId) {
    return (
      <div className="monitoring-tab empty">
        <p>Выберите палату для просмотра мониторинга</p>
      </div>
    );
  }

  if (initialLoading && !dashboard) {
    return (
      <div className="monitoring-tab loading">
        <div className="monitoring-spinner" />
        <p>Загрузка данных с датчиков…</p>
      </div>
    );
  }

  const screenUpdated = lastRefreshedAt
    ? formatTime(lastRefreshedAt.toISOString())
    : null;
  const sensorsUpdated =
    dashboard?.sensors_updated_at || dashboard?.health.updated_at || null;

  return (
    <div className="monitoring-tab">
      <div className="monitoring-toolbar">
        <div className="monitoring-status">
          <span
            className={`monitoring-dot ${dashboard?.connected ? 'online' : 'offline'} ${
              isRefreshing ? 'pulse' : ''
            }`}
          />
          {dashboard?.connected ? 'Мониторинг подключён' : 'Нет связи с сервисом'}
          {screenUpdated && (
            <span className="monitoring-updated" title="Время последнего успешного запроса к API">
              на экране: {screenUpdated}
            </span>
          )}
          {sensorsUpdated && (
            <span className="monitoring-sensors-updated" title="Время снимка на сервере датчиков">
              · датчики: {formatTime(sensorsUpdated)}
            </span>
          )}
        </div>
        <button
          type="button"
          className="monitoring-refresh"
          onClick={() => void load({ silent: true, force: true })}
          disabled={initialLoading}
        >
          {isRefreshing ? 'Обновление…' : 'Обновить'}
        </button>
      </div>

      {error && <div className="monitoring-error">{error}</div>}

      {dashboard?.connected && dashboard.health.device_count != null && (
        <div className="monitoring-meta">
          Устройств в сети: {dashboard.health.device_count}
          {dashboard.unassigned_ble.length > 0 && (
            <> · без привязки к койке: {dashboard.unassigned_ble.length}</>
          )}
        </div>
      )}

      {(dashboard?.atmosphere || dashboard?.atmosphere_error) && (
        <section className="monitoring-section atmosphere-section">
          <h3>
            Атмосфера в палате
            {dashboard.monitor_zone != null && ` (зона ${dashboard.monitor_zone})`}
          </h3>
          {dashboard.atmosphere_error && (
            <div className="monitoring-atmosphere-warn">{dashboard.atmosphere_error}</div>
          )}
          {dashboard.atmosphere && (
            <div className="atmosphere-grid">
              {(['temp', 'hum', 'press', 'co2'] as const).map((key) => (
                <div key={key} className="metric-card">
                  <div className="metric-label">{METRIC_LABELS[key]}</div>
                  <div className="metric-value">
                    {formatMetric(key, dashboard.atmosphere?.[key])}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="monitoring-section">
        <h3>Показатели по койкам (браслеты BLE)</h3>
        <div className="beds-monitoring-grid">
          {dashboard?.beds.map((bed) => (
            <div
              key={bed.bed_id}
              className={`bed-monitor-card ${bed.ble?.online === false ? 'offline' : ''}`}
            >
              <div className="bed-monitor-header">
                <span className="bed-num">Койка {bed.bed_number}</span>
                {bed.ble && (
                  <span className={`ble-status ${bed.ble.online !== false ? 'on' : 'off'}`}>
                    {bed.ble.online !== false ? '● онлайн' : '○ офлайн'}
                  </span>
                )}
              </div>
              {bed.patient_name ? (
                <div className="bed-patient-name">{bed.patient_name}</div>
              ) : (
                <div className="bed-patient-empty">Свободна</div>
              )}
              {bed.ble_mac && (
                <div className="bed-mac">MAC: {bed.ble_mac}</div>
              )}
              {bed.ble && Object.keys(bed.ble.metrics).length > 0 ? (
                <div className="ble-metrics">
                  {Object.entries(bed.ble.metrics).map(([key, val]) => (
                    <div key={key} className="ble-metric-row">
                      <span>{METRIC_LABELS[key] || key}</span>
                      <strong>{formatMetric(key, val)}</strong>
                    </div>
                  ))}
                </div>
              ) : bed.patient_name && bed.ble_mac ? (
                <div className="ble-no-data">Нет данных с браслета</div>
              ) : bed.patient_name && !bed.ble_mac ? (
                <div className="ble-no-data">MAC браслета не указан в карточке пациента</div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {dashboard && dashboard.unassigned_ble.length > 0 && (
        <section className="monitoring-section">
          <h3>Браслеты без привязки к койке</h3>
          <div className="unassigned-ble-list">
            {dashboard.unassigned_ble.map((device) => (
              <div key={device.mac} className="unassigned-ble-item">
                <code>{device.mac}</code>
                <div className="ble-metrics compact">
                  {Object.entries(device.metrics).slice(0, 4).map(([key, val]) => (
                    <span key={key}>
                      {METRIC_LABELS[key] || key}: {formatMetric(key, val)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default RoomMonitoringTab;
