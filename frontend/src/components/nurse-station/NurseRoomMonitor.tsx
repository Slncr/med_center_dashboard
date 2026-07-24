import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { Bed, Patient, Room } from '../../types';
import type { VitalAlert } from '../../types/braceletAlerts';
import { MonitoringDashboard } from '../../types/monitoring';
import {
  alertLevelForMetric,
  displayMetrics,
  levelClassName,
} from '../../utils/braceletVitals';
import { unwrapMetric } from '../../utils/monitoringDisplay';
import AppointmentsView from './AppointmentsView';
import BedPatientFlags from './BedPatientFlags';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  ATM_ICONS,
  formatMetricValue,
  METRIC_LABELS,
} from '../../utils/monitoringDisplay';
import './NurseRoomMonitor.css';

const POLL_MS = 4000;

interface NurseRoomMonitorProps {
  rooms: Room[];
  onPatientSelect?: (patientId: number | null) => void;
}

const formatClock = (date: Date): string =>
  date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const NurseRoomMonitor: React.FC<NurseRoomMonitorProps> = ({ rooms, onPatientSelect }) => {
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [alertsByPatient, setAlertsByPatient] = useState<Map<number, VitalAlert[]>>(
    () => new Map(),
  );

  useEffect(() => {
    if (rooms.length === 0) {
      setActiveRoomId(null);
      return;
    }
    if (!activeRoomId || !rooms.some((r) => r.id === activeRoomId)) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const selectedBed = useMemo(
    () => activeRoom?.beds.find((b) => b.id === selectedBedId) ?? null,
    [activeRoom, selectedBedId],
  );

  const selectedPatient = selectedBed?.patient ?? null;

  const bedMetricsMap = useMemo(() => {
    const map = new Map<number, MonitoringDashboard['beds'][0]>();
    dashboard?.beds.forEach((b) => map.set(b.bed_id, b));
    return map;
  }, [dashboard]);

  const loadDashboard = useCallback(
    async (silent: boolean) => {
      if (!activeRoomId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const data = await apiService.getMonitoringDashboard(activeRoomId);
        setDashboard(data);
        setLastUpdatedAt(new Date());
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить данные мониторинга палаты');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeRoomId],
  );

  const loadBraceletAlerts = useCallback(async () => {
    try {
      const overview = await apiService.getBraceletOverview();
      const map = new Map<number, VitalAlert[]>();
      overview.patients.forEach((p) => map.set(p.patient_id, p.alerts));
      setAlertsByPatient(map);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) return undefined;
    void loadDashboard(false);
    void loadBraceletAlerts();
    const timer = setInterval(() => {
      void loadDashboard(true);
      void loadBraceletAlerts();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [activeRoomId, loadDashboard, loadBraceletAlerts]);

  const flattenBleMetrics = (
    metrics: Record<string, string | number | boolean | null>,
  ): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    Object.entries(metrics).forEach(([key, value]) => {
      out[key] = unwrapMetric(value);
    });
    return out;
  };

  const handleRoomChange = (roomId: number) => {
    setActiveRoomId(roomId);
    setSelectedBedId(null);
    setDashboard(null);
    onPatientSelect?.(null);
  };

  const handleBedSelect = (bed: Bed) => {
    setSelectedBedId(bed.id);
    onPatientSelect?.(bed.patient?.id ?? null);
  };

  const roomStats = useMemo(() => {
    if (!activeRoom) return { total: 0, occupied: 0, free: 0 };
    const total = activeRoom.beds.length;
    const occupied = activeRoom.beds.filter((b) => b.patient).length;
    return { total, occupied, free: total - occupied };
  }, [activeRoom]);

  if (rooms.length === 0) {
    return (
      <div className="nurse-room-monitor empty">
        <p>Нет данных о палатах</p>
      </div>
    );
  }

  return (
    <div className="nurse-room-monitor">
      <div className="nrm-toolbar">
        <div className="nrm-toolbar-left">
          <label className="nrm-room-label" htmlFor="nrm-room-select">
            Палата
          </label>
          <select
            id="nrm-room-select"
            className="nrm-room-select"
            value={activeRoomId ?? ''}
            onChange={(e) => handleRoomChange(Number(e.target.value))}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                №{room.number}
                {room.name ? ` — ${room.name}` : ''}
                {room.floor != null ? ` (${room.floor} этаж)` : ''}
              </option>
            ))}
          </select>
          {activeRoom?.wing && <span className="nrm-room-meta">Крыло: {activeRoom.wing}</span>}
        </div>
        <div className="nrm-toolbar-right">
          <span
            className={`nrm-connection ${dashboard?.connected ? 'connected' : 'disconnected'}`}
          >
            {dashboard?.connected ? 'Мониторинг онлайн' : 'Мониторинг недоступен'}
          </span>
          {lastUpdatedAt && (
            <span className="nrm-updated">Обновлено: {formatClock(lastUpdatedAt)}</span>
          )}
          <button
            type="button"
            className="nrm-refresh-btn"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing || loading}
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      {error && <div className="nrm-error">{error}</div>}

      <div className="nrm-layout">
        <section className="nrm-main">
          {activeRoom && (
            <div className="nrm-room-summary">
              <div className="nrm-summary-card">
                <span className="nrm-summary-label">Коек</span>
                <strong>{roomStats.total}</strong>
              </div>
              <div className="nrm-summary-card occupied">
                <span className="nrm-summary-label">Занято</span>
                <strong>{roomStats.occupied}</strong>
              </div>
              <div className="nrm-summary-card free">
                <span className="nrm-summary-label">Свободно</span>
                <strong>{roomStats.free}</strong>
              </div>
              {dashboard?.monitor_zone != null && (
                <div className="nrm-summary-card">
                  <span className="nrm-summary-label">Зона ATM</span>
                  <strong>{dashboard.monitor_zone}</strong>
                </div>
              )}
            </div>
          )}

          {dashboard?.atmosphere && (
            <div className="nrm-atmosphere">
              <h3 className="nrm-section-title">Атмосфера палаты</h3>
              <div className="nrm-atmosphere-grid">
                {(['temp', 'hum', 'press', 'co2'] as const).map((key) => (
                  <div key={key} className="nrm-atm-item">
                    <span>
                      {ATM_ICONS[key]} {METRIC_LABELS[key]}
                    </span>
                    <strong>{formatMetricValue(key, dashboard.atmosphere![key])}</strong>
                  </div>
                ))}
              </div>
              {dashboard.atmosphere_error && (
                <p className="nrm-atm-error">{dashboard.atmosphere_error}</p>
              )}
            </div>
          )}

          {loading && !dashboard ? (
            <div className="nrm-loading">
              <LoadingSpinner size="medium" />
              <p>Загрузка коек…</p>
            </div>
          ) : (
            <div className="nrm-beds-grid">
              {activeRoom?.beds.map((bed) => {
                const isOccupied = Boolean(bed.patient);
                const bedData = bedMetricsMap.get(bed.id);
                const isSelected = selectedBedId === bed.id;
                const patient = bed.patient as Patient | undefined;
                const metrics = bedData?.ble?.metrics ?? {};
                const patientAlerts = patient?.id
                  ? alertsByPatient.get(patient.id) ?? []
                  : [];
                const metricRows = displayMetrics(flattenBleMetrics(metrics)).slice(0, 6);

                return (
                  <button
                    key={bed.id}
                    type="button"
                    className={`nrm-bed-card ${isOccupied ? 'occupied' : 'free'} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleBedSelect(bed)}
                  >
                    <div className="nrm-bed-card-head">
                      <span className="nrm-bed-number">Койка {bed.number}</span>
                      <span className={`nrm-bed-state ${isOccupied ? 'occupied' : 'free'}`}>
                        {isOccupied ? 'Занята' : 'Свободна'}
                      </span>
                    </div>

                    {isOccupied && patient ? (
                      <div className="nrm-bed-info">
                        <div className="nrm-bed-patient-name">{patient.full_name}</div>
                        <div className="nrm-bed-meta">
                          {patient.department_name && <span>{patient.department_name}</span>}
                          <span>
                            Поступил:{' '}
                            {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <BedPatientFlags patient={patient} />
                        {bedData?.ble_mac && (
                          <div className="nrm-ble-hint">⌚ {bedData.ble_mac}</div>
                        )}
                      </div>
                    ) : (
                      <p className="nrm-bed-free-label">Нет пациента на койке</p>
                    )}
                    <div className="nrm-bed-metrics">
                      {metricRows.length > 0 ? (
                        metricRows.map((row) => {
                          const level = alertLevelForMetric(patientAlerts, row.canonical);
                          return (
                            <div
                              key={row.canonical}
                              className={`nrm-metric-chip ${levelClassName(level)}`}
                              title={level !== 'normal' ? `${row.label}: внимание` : undefined}
                            >
                              <span>{row.label}</span>
                              <strong>{row.value}</strong>
                            </div>
                          );
                        })
                      ) : (
                        <span className="nrm-metrics-empty">
                          {isOccupied ? 'Нет данных с браслета' : '—'}
                        </span>
                      )}
                    </div>
                    {isOccupied && (
                      <div className="nrm-bed-cta">Назначения →</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="nrm-side">
          {selectedBed && selectedPatient ? (
            <>
              <div className="nrm-side-header">
                <h3>Койка {selectedBed.number}</h3>
                <p className="nrm-side-patient">{selectedPatient.full_name}</p>
                <button
                  type="button"
                  className="nrm-side-close"
                  onClick={() => {
                    setSelectedBedId(null);
                    onPatientSelect?.(null);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="nrm-side-body">
                <AppointmentsView
                  variant="roomPanel"
                  patientId={selectedPatient.id}
                />
              </div>
            </>
          ) : selectedBed && !selectedPatient ? (
            <div className="nrm-side-empty">
              <h3>Койка {selectedBed.number}</h3>
              <p>Койка свободна — назначений нет.</p>
              <button
                type="button"
                className="nrm-side-close-btn"
                onClick={() => setSelectedBedId(null)}
              >
                Закрыть
              </button>
            </div>
          ) : (
            <div className="nrm-side-empty">
              <h3>Назначения</h3>
              <p>Выберите занятую койку в палате, чтобы открыть лист назначений пациента.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default NurseRoomMonitor;
