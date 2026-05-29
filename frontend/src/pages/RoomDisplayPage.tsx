import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { Room } from '../types';
import { BedMonitoringView, MonitoringDashboard } from '../types/monitoring';
import BedSchematic from '../components/room-display/BedSchematic';
import { bedFlagsFromPatient } from '../utils/patientFlags';
import './RoomDisplayPage.css';

const POLL_MS = 3000;

const METRIC_LABELS: Record<string, string> = {
  temp: 'Температура',
  hum: 'Влажность',
  press: 'Арт. давление',
  co2: 'CO₂',
  pulse: 'Пульс',
  puls: 'Пульс',
  pulse_rate: 'Пульс',
  bpm: 'Пульс',
  hr: 'ЧСС',
  hrv: 'Вариабельность ЧСС',
  sleep: 'Сон',
  stress: 'Стресс',
  bp: 'Арт. давление',
  spo2: 'SpO₂',
  sp_o2: 'SpO₂',
  oxygen: 'Кислород',
  respiration: 'Дыхание',
  rr: 'Дыхание',
  battery: 'Батарея',
  rssi: 'Уровень сигнала',
};

const ATM_ICONS: Record<string, string> = {
  temp: '🌡️',
  hum: '💧',
  press: '📊',
  co2: '🌬️',
};

const unwrapMetric = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'value' in (value as object)) {
    return (value as { value: unknown }).value;
  }
  return value;
};

const formatMetricValue = (key: string, value: unknown): string => {
  const v = unwrapMetric(value);
  const normalizedKey = normalizeMetricKey(key);
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  if (normalizedKey === 'bp') return String(v);
  if (typeof v === 'number') {
    if (normalizedKey === 'temp') return `${v.toFixed(1)} °C`;
    if (normalizedKey === 'hum') return `${Math.round(v)} %`;
    if (normalizedKey === 'press') return `${Math.round(v)} мм`;
    if (normalizedKey === 'co2') return `${Math.round(v)} ppm`;
    return Number.isInteger(v) ? `${v}` : v.toFixed(1);
  }
  return String(v);
};

const normalizeMetricKey = (rawKey: string): string => rawKey.trim().toLowerCase();

const getMetricLabel = (rawKey: string): string => {
  const key = normalizeMetricKey(rawKey);
  if (METRIC_LABELS[key]) return METRIC_LABELS[key];
  return rawKey.replace(/_/g, ' ');
};

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const RoomDisplayPage: React.FC = () => {
  const { monitorId: monitorIdFromPath } = useParams<{ monitorId: string }>();
  const [searchParams] = useSearchParams();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monitorId = monitorIdFromPath ?? searchParams.get('monitorId') ?? searchParams.get('monitor_id');
  const isTestMode = !monitorId;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const roomsData = await apiService.getRooms();
        setRooms(roomsData);
        setApiConnected(true);
        if (roomsData.length === 0) {
          setError('Нет данных о палатах');
          return;
        }

        if (monitorId) {
          const parsedMonitor = Number(monitorId);
          if (!Number.isNaN(parsedMonitor)) {
            const matched = roomsData.find((room) => room.id === parsedMonitor);
            if (matched) {
              setActiveRoomId(matched.id);
              return;
            }
          }
          setError(`Монитор ${monitorId} не привязан к палате`);
        }

        setActiveRoomId(roomsData[0].id);
      } catch (err) {
        console.error('Ошибка загрузки палат:', err);
        setApiConnected(false);
        setError('Ошибка подключения к серверу');
      } finally {
        setRoomsLoading(false);
      }
    };

    void loadRooms();
  }, [monitorId]);

  const loadDashboard = useCallback(async (silent: boolean) => {
    if (!activeRoomId) return;

    try {
      if (silent) setRefreshing(true);

      const [data, roomsData] = await Promise.all([
        apiService.getMonitoringDashboard(activeRoomId),
        apiService.getRooms(),
      ]);
      setDashboard(data);
      setRooms(roomsData);
      setApiConnected(data.connected);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setApiConnected(false);
      console.error('Ошибка загрузки мониторинга:', err);
    } finally {
      setRefreshing(false);
    }
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;

    void loadDashboard(false);
    const interval = setInterval(() => {
      void loadDashboard(true);
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [activeRoomId, loadDashboard]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  const bedMetricsMap = useMemo(() => {
    const byId = new Map<number, BedMonitoringView>();
    dashboard?.beds.forEach((bed) => byId.set(bed.bed_id, bed));
    return byId;
  }, [dashboard]);

  const atmosphere = dashboard?.atmosphere;

  const handleRoomChange = (roomId: number) => {
    setActiveRoomId(roomId);
    setDashboard(null);
  };

  if (roomsLoading) {
    return (
      <div className="room-display-page loading">
        <div className="loading-content">
          <div className="clinic-logo">🏥</div>
          <div className="spinner" />
          <p>Загрузка экрана палаты...</p>
        </div>
      </div>
    );
  }

  if (error && !activeRoom) {
    return (
      <div className="room-display-page error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="retry-btn">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-display-page">
      <header className="room-header">
        <div className="header-left">
          <div className="clinic-logo">🏥</div>
          <div className="clinic-name">Медицинский центр</div>
          <div className="room-title">
            {activeRoom ? `Палата №${activeRoom.number}` : 'Палата не выбрана'}
            {monitorId && <span className="monitor-badge">Монитор {monitorId}</span>}
            {isTestMode && <span className="test-badge">Тест</span>}
          </div>
        </div>

        {isTestMode && rooms.length > 0 && (
          <div className="room-test-selector">
            <label htmlFor="room-test-select">Палата для теста</label>
            <select
              id="room-test-select"
              value={activeRoomId ?? ''}
              onChange={(e) => handleRoomChange(Number(e.target.value))}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  №{room.number}
                  {room.name ? ` — ${room.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="header-center">
          <div className="current-time">
            <span className="time">
              {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="date">{currentTime.toLocaleDateString('ru-RU')}</span>
          </div>
        </div>

        <div className="header-right">
          <div className={`connection-indicator ${apiConnected ? 'connected' : 'disconnected'}`} />
          {lastUpdatedAt && <div className="updated-label">Обновлено: {formatTime(lastUpdatedAt)}</div>}
        </div>
      </header>

      <main className="room-main">
        <section className="beds-panel">
          {activeRoom ? (
            activeRoom.beds.map((bed) => {
              const bedData = bedMetricsMap.get(bed.id);
              const isOccupied = Boolean(bed.patient);
              const metrics = bedData?.ble?.metrics ?? {};
              const metricEntries = Object.entries(metrics).filter(
                ([key]) => {
                  const normalized = normalizeMetricKey(key);
                  return !['steps', 'wear', 'battery', 'rssi'].includes(normalized);
                },
              ).sort(([a], [b]) => getMetricLabel(a).localeCompare(getMetricLabel(b), 'ru'));
              const hasMetrics = metricEntries.length > 0;

              return (
                <article key={bed.id} className={`bed-strip ${isOccupied ? 'occupied' : 'free'}`}>
                  <BedSchematic
                    occupied={isOccupied}
                    bedNumber={bed.number}
                    flags={bedFlagsFromPatient(bed.patient)}
                  />

                  <div className="bed-metrics">
                    {hasMetrics ? (
                      metricEntries.map(([key, value]) => (
                        <div key={key} className="metric-chip">
                          <span>{getMetricLabel(key)}</span>
                          <strong>{formatMetricValue(key, value)}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="metric-empty">
                        {isOccupied ? 'Нет данных с браслета' : 'Койка свободна'}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-state">Палата не найдена</div>
          )}
        </section>

        <aside className="atmosphere-column">
          <div className="column-header">
            <h2>Атмосфера</h2>
            {dashboard?.monitor_zone != null && (
              <div className="zone-badge">Зона {dashboard.monitor_zone}</div>
            )}
          </div>

          {atmosphere ? (
            <div className="atmosphere-list">
              {(['temp', 'hum', 'press', 'co2'] as const).map((key) => (
                <div key={key} className={`atmosphere-item atmosphere-${key}`}>
                  <div className="atmosphere-item-label">
                    <span className="atmosphere-icon">{ATM_ICONS[key]}</span>
                    <span>{METRIC_LABELS[key]}</span>
                  </div>
                  <strong>{formatMetricValue(key, atmosphere[key])}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="metric-empty">Нет атмосферных данных</div>
          )}

          {dashboard?.atmosphere_error && (
            <div className="atmosphere-error">{dashboard.atmosphere_error}</div>
          )}

          {refreshing && <div className="refresh-badge">Обновление коек…</div>}
        </aside>
      </main>
    </div>
  );
};

export default RoomDisplayPage;
