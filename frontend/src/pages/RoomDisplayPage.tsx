import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { URL_PARAMS } from '../utils/urlTabs';
import { apiService } from '../services/api';
import { Room } from '../types';
import { BedMonitoringView, MonitoringDashboard } from '../types/monitoring';
import BedSchematic from '../components/room-display/BedSchematic';
import {
  PatientFlagKey,
  activePatientFlagStatuses,
  bedFlagsFromPatient,
} from '../utils/patientFlags';
import {
  ATM_ICONS,
  filterBleMetricEntries,
  formatMetricValue,
  getMetricLabel,
  normalizeMetricKey,
  METRIC_LABELS,
  unwrapMetric,
} from '../utils/monitoringDisplay';
import './RoomDisplayPage.css';
import './RoomDisplayPageV2.css';

const POLL_MS = 3000;
const PAGE_RELOAD_MS = 15 * 60 * 1000;

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Порядок флагов как на макете: сверху вниз */
const ROOM_FLAG_ORDER: PatientFlagKey[] = [
  'flag_green',
  'flag_red',
  'flag_orange',
  'flag_yellow',
  'flag_white',
];

const metricImage = (name: string) => `${process.env.PUBLIC_URL}/images/${name}`;

const PRIMARY_METRICS: Array<{
  key: string;
  label: string;
  aliases: string[];
  icon: string;
}> = [
  { key: 'temp', label: 'Температура', aliases: ['temp', 'temperature'], icon: 'temp-chel.png' },
  { key: 'pulse', label: 'Пульс', aliases: ['pulse', 'hr', 'puls', 'pulse_rate', 'bpm'], icon: 'pulse.png' },
  { key: 'press', label: 'Арт. давление', aliases: ['press', 'bp'], icon: 'art-davl.png' },
  { key: 'spo2', label: 'SpO₂', aliases: ['spo2', 'sp_o2', 'oxygen'], icon: 'spo2.png' },
  { key: 'sleep', label: 'Сон', aliases: ['sleep'], icon: 'sleep.png' },
];

const ATM_METRIC_IMAGES: Record<'temp' | 'hum' | 'press', string> = {
  temp: 'temperatura.png',
  hum: 'vlajnost.png',
  press: 'davlenie.png',
};

interface MetricParts {
  value: string;
  unit: string;
}

const formatRoomMetricParts = (key: string, rawValue: unknown): MetricParts => {
  const v = unwrapMetric(rawValue);
  if (v === null || v === undefined || v === '') {
    return { value: '—', unit: '' };
  }

  if (key === 'press') {
    const text = String(v);
    if (text.includes('/')) {
      return { value: text, unit: 'мм. рт. ст.' };
    }
    const n = Number(v);
    if (!Number.isNaN(n)) {
      return { value: `${Math.round(n)}`, unit: 'мм. рт. ст.' };
    }
    return { value: text, unit: 'мм. рт. ст.' };
  }

  const n = Number(v);
  if (Number.isNaN(n)) {
    return { value: String(v), unit: '' };
  }

  switch (key) {
    case 'spo2':
      return { value: `${Math.round(n)}%`, unit: '' };
    case 'pulse':
      return { value: `${Math.round(n)}`, unit: 'уд/мин' };
    case 'temp':
      return { value: n.toFixed(1), unit: '°C' };
    case 'sleep': {
      const totalMin = Math.round(n);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (hours > 0) {
        return { value: `${hours} ч ${mins} мин`, unit: '' };
      }
      return { value: `${mins} мин`, unit: '' };
    }
    default:
      return { value: Number.isInteger(n) ? `${n}` : n.toFixed(1), unit: '' };
  }
};

const pickMetricParts = (
  metrics: Record<string, string | number | boolean | null>,
  metricKey: string,
  aliases: string[],
): MetricParts => {
  const entries = Object.entries(metrics);
  for (const alias of aliases) {
    const found = entries.find(([rawKey, rawValue]) => {
      if (rawValue === null || rawValue === undefined || rawValue === '') return false;
      return normalizeMetricKey(rawKey) === alias;
    });
    if (found) {
      return formatRoomMetricParts(metricKey, found[1]);
    }
  }
  return { value: '—', unit: '' };
};

const formatAtmosphereParts = (key: 'temp' | 'hum' | 'press', value: unknown): MetricParts => {
  const v = unwrapMetric(value);
  if (v === null || v === undefined) {
    return { value: '—', unit: '' };
  }
  const n = Number(v);
  if (Number.isNaN(n)) {
    return { value: String(v), unit: '' };
  }
  if (key === 'temp') return { value: n.toFixed(1), unit: '°C' };
  if (key === 'hum') return { value: `${Math.round(n)}`, unit: '%' };
  return { value: `${Math.round(n)}`, unit: 'мм' };
};

const PatientAvatarIcon: React.FC = () => (
  <img
    className="rdv2-avatar-icon"
    src={metricImage('chelik.png')}
    alt=""
    aria-hidden
  />
);

const RoomDisplayPage: React.FC = () => {
  const { monitorId: monitorIdFromPath } = useParams<{ monitorId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const useLegacyLayout = searchParams.get('legacy') === '1';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const reloadTimer = setInterval(() => {
      window.location.reload();
    }, PAGE_RELOAD_MS);
    return () => clearInterval(reloadTimer);
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

        const roomFromQuery = searchParams.get(URL_PARAMS.room);
        if (roomFromQuery) {
          const parsedRoom = Number(roomFromQuery);
          if (!Number.isNaN(parsedRoom)) {
            const matched = roomsData.find((room) => room.id === parsedRoom);
            if (matched) {
              setActiveRoomId(matched.id);
              return;
            }
          }
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
    // room из query читается при загрузке; смена ?room= в handleRoomChange не перезагружает список
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

  const roomBeds = useMemo(() => {
    if (!activeRoom) return [];
    return [...activeRoom.beds].sort((a, b) => Number(a.number) - Number(b.number));
  }, [activeRoom]);

  const handleRoomChange = (roomId: number) => {
    setActiveRoomId(roomId);
    setDashboard(null);
    if (isTestMode) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(URL_PARAMS.room, String(roomId));
          return next;
        },
        { replace: true },
      );
    }
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

  if (useLegacyLayout) {
    return (
      <LegacyRoomDisplayLayout
        activeRoom={activeRoom}
        activeRoomId={activeRoomId}
        apiConnected={apiConnected}
        atmosphere={atmosphere}
        currentTime={currentTime}
        dashboard={dashboard}
        error={error}
        handleRoomChange={handleRoomChange}
        isTestMode={isTestMode}
        lastUpdatedAt={lastUpdatedAt}
        monitorId={monitorId}
        refreshing={refreshing}
        rooms={rooms}
        bedMetricsMap={bedMetricsMap}
      />
    );
  }

  return (
    <div className="rdv2-page">
      <header className="rdv2-header">
        <div className="rdv2-title-wrap">
          <h1 className="rdv2-room-title">{activeRoom ? `Палата №${activeRoom.number}` : 'Палата'}</h1>
          {monitorId && <span className="rdv2-badge">Монитор {monitorId}</span>}
          {isTestMode && <span className="rdv2-badge rdv2-badge--test">Тест</span>}
        </div>
        <div className="rdv2-header-right">
          <span
            className={`rdv2-connection-dot ${apiConnected ? 'is-online' : 'is-offline'}`}
            aria-label={apiConnected ? 'Мониторинг онлайн' : 'Мониторинг недоступен'}
          />
          <span className="rdv2-time">
            {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {isTestMode && rooms.length > 0 && (
        <div className="rdv2-room-picker">
          <label htmlFor="room-test-select">Палата</label>
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

      <main className="rdv2-main">
        <div className="rdv2-beds-list">
        {activeRoom ? (
          roomBeds.map((bed) => {
            const isOccupied = Boolean(bed.patient);
            const bedData = bedMetricsMap.get(bed.id);
            const metrics = bedData?.ble?.metrics ?? {};
            const activeFlags = isOccupied
              ? activePatientFlagStatuses(bed.patient).sort(
                  (a, b) => ROOM_FLAG_ORDER.indexOf(a.key) - ROOM_FLAG_ORDER.indexOf(b.key),
                )
              : [];
            const metricCards = PRIMARY_METRICS.map((metric) => {
              const parts = isOccupied
                ? pickMetricParts(metrics, metric.key, metric.aliases)
                : { value: '—', unit: '' };
              return {
                key: metric.key,
                label: metric.label,
                value: parts.value,
                unit: parts.unit,
                icon: metric.icon,
              };
            });

            return (
              <article key={bed.id} className={`rdv2-bed-card ${isOccupied ? 'occupied' : 'free'}`}>
                <div className="rdv2-bed-card-body">
                  <div className="rdv2-patient-side">
                    {activeFlags.length > 0 && (
                      <div className="rdv2-status-flags" aria-label="Статусы пациента">
                        {activeFlags.map((flag) => (
                          <span
                            key={flag.key}
                            className={`rdv2-flag rdv2-flag--${flag.color} is-active`}
                            title={flag.label}
                          >
                            <span className="rdv2-flag-icon-slot" aria-hidden />
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={`rdv2-avatar-box ${isOccupied ? 'occupied' : 'free'}`}>
                      <PatientAvatarIcon />
                    </div>
                  </div>

                  <div className="rdv2-metrics-grid">
                    {metricCards.map((metric) => (
                      <div key={metric.key} className={`rdv2-metric-card rdv2-metric-card--${metric.key}`}>
                        <span className="rdv2-metric-icon-wrap" aria-hidden>
                          <img
                            className="rdv2-metric-icon"
                            src={metricImage(metric.icon)}
                            alt=""
                          />
                        </span>
                        <div className="rdv2-metric-text">
                          <span className="rdv2-metric-label">{metric.label}</span>
                          <strong className="rdv2-metric-value">{metric.value}</strong>
                          {metric.unit ? (
                            <span className="rdv2-metric-unit">{metric.unit}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">Палата не найдена</div>
        )}
        </div>
      </main>

      <footer className="rdv2-atmosphere-footer">
        <div className="rdv2-atmosphere-row">
          {(['temp', 'hum', 'press'] as const).map((key) => {
            const parts = formatAtmosphereParts(key, atmosphere?.[key]);
            return (
              <div key={key} className={`rdv2-atm-card rdv2-atm-card--${key}`}>
                <span className="rdv2-icon-slot rdv2-icon-slot--atm" aria-hidden>
                  <img
                    className="rdv2-atm-icon"
                    src={metricImage(ATM_METRIC_IMAGES[key])}
                    alt=""
                  />
                </span>
                <div className="rdv2-atm-content">
                  <span className="rdv2-atm-label">
                    {key === 'temp' ? 'Температура' : key === 'hum' ? 'Влажность' : 'Давление'}
                  </span>
                  <strong className="rdv2-atm-value">
                    {parts.value}
                    {parts.unit ? ` ${parts.unit}` : ''}
                  </strong>
                  <span className="rdv2-atm-meta">
                    {key === 'temp' && 'Норма 22–26 °C'}
                    {key === 'hum' && 'Норма 40–60 %'}
                    {key === 'press' && 'Норма 1000–1025 мм'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </footer>
      {error && <div className="rdv2-inline-error">{error}</div>}
      {dashboard?.atmosphere_error && <div className="rdv2-inline-error">{dashboard.atmosphere_error}</div>}
    </div>
  );
};

interface LegacyLayoutProps {
  activeRoom: Room | null;
  activeRoomId: number | null;
  apiConnected: boolean;
  atmosphere: MonitoringDashboard['atmosphere'];
  currentTime: Date;
  dashboard: MonitoringDashboard | null;
  error: string | null;
  handleRoomChange: (roomId: number) => void;
  isTestMode: boolean;
  lastUpdatedAt: Date | null;
  monitorId: string | null;
  refreshing: boolean;
  rooms: Room[];
  bedMetricsMap: Map<number, BedMonitoringView>;
}

const LegacyRoomDisplayLayout: React.FC<LegacyLayoutProps> = ({
  activeRoom,
  activeRoomId,
  apiConnected,
  atmosphere,
  currentTime,
  dashboard,
  error,
  handleRoomChange,
  isTestMode,
  lastUpdatedAt,
  monitorId,
  refreshing,
  rooms,
  bedMetricsMap,
}) => {
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
              const metricEntries = filterBleMetricEntries(metrics);
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
