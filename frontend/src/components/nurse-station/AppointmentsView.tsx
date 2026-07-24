import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Patient, Prescription, Room } from '../../types';
import { prescriptionProgress } from '../../utils/prescriptionPackages';
import { getPrescriptionStatusLabel } from '../../utils/formatters';
import './AppointmentsView.css';
import './RoomAppointmentsPanel.css';
import { appConfirm } from '../../context/AppDialogContext';

interface AppointmentsViewProps {
  patientId: number | null;
  onPatientSelect?: (patientId: number) => void;
  patientOptions?: Patient[];
  rooms?: Room[];
  /** Полная вкладка «Назначения» или панель на экране «Палаты» */
  variant?: 'full' | 'roomPanel';
}

const getPatientRoomAndBed = (patient: Patient, rooms: Room[]) => {
  if (!patient.bed_id) {
    return { room: undefined, bed: undefined };
  }
  for (const room of rooms) {
    const bed = room.beds.find((item) => item.id === patient.bed_id);
    if (bed) {
      return { room, bed };
    }
  }
  return { room: undefined, bed: undefined };
};

const formatRxDate = (prescription: Prescription): string => {
  const raw = prescription.start_date || prescription.created_at;
  try {
    return new Date(raw).toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
};

const getProgressMeta = (prescription: Prescription): { label: string; tone: 'partial' | 'complete' | 'cancelled' } => {
  if (prescription.status === 'CANCELLED') {
    return { label: 'Отменено', tone: 'cancelled' };
  }
  const req = prescription.executions_required ?? 1;
  const done = prescription.executions_done ?? 0;
  const isComplete = prescription.status === 'COMPLETED' || done >= req;
  return {
    label: `${isComplete ? req : done}/${req} выполнено`,
    tone: isComplete ? 'complete' : 'partial',
  };
};

const patientMatchesFilter = (
  patientId: number,
  filterStatus: 'all' | 'active' | 'completed' | 'cancelled',
  prescriptionsByPatient: Record<number, Prescription[]>,
): boolean => {
  if (filterStatus === 'all') {
    return true;
  }
  const list = (prescriptionsByPatient[patientId] ?? []).filter(
    (item) => item.prescription_type !== 'NOTE',
  );
  if (list.length === 0) {
    return false;
  }
  if (filterStatus === 'active') {
    return list.some((item) => item.status === 'ACTIVE');
  }
  if (filterStatus === 'completed') {
    return list.some((item) => item.status === 'COMPLETED');
  }
  return list.some((item) => item.status === 'CANCELLED');
};

const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  patientId,
  onPatientSelect,
  patientOptions,
  rooms = [],
  variant = 'full',
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(patientId);
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPrescriptionsCount, setTotalPrescriptionsCount] = useState(0);
  const [prescriptionsByPatient, setPrescriptionsByPatient] = useState<Record<number, Prescription[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<number | null>(null);

  const syncAllPrescriptionsData = useCallback(async (patientList: Patient[]) => {
    if (patientList.length === 0) {
      setTotalPrescriptionsCount(0);
      setPrescriptionsByPatient({});
      return;
    }
    try {
      const pairs = await Promise.all(
        patientList.map(async (patient) => {
          const data = await apiService.getPrescriptions(patient.id);
          return [patient.id, data] as const;
        }),
      );
      const byPatient: Record<number, Prescription[]> = {};
      let total = 0;
      for (const [id, list] of pairs) {
        byPatient[id] = list;
        total += list.filter((item) => item.prescription_type !== 'NOTE').length;
      }
      setPrescriptionsByPatient(byPatient);
      setTotalPrescriptionsCount(total);
    } catch {
      setTotalPrescriptionsCount(0);
      setPrescriptionsByPatient({});
    }
  }, []);

  useEffect(() => {
    if (patientOptions) {
      setPatients(patientOptions);
      if (patientOptions.length > 0) {
        void syncAllPrescriptionsData(patientOptions);
      }
      return;
    }
    if (variant === 'full') {
      void loadPatients();
    }
  }, [patientOptions, variant, syncAllPrescriptionsData]);

  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
      void loadPrescriptions(patientId);
    } else {
      setSelectedPatientId(null);
      setPrescriptions([]);
    }
  }, [patientId]);

  const loadPatients = async () => {
    try {
      const data = await apiService.getPatients();
      setPatients(data);
      await syncAllPrescriptionsData(data);
    } catch (err) {
      setError('Ошибка загрузки пациентов');
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      if (patientOptions) {
        await syncAllPrescriptionsData(patientOptions);
      } else {
        await loadPatients();
      }
      if (selectedPatientId) {
        await loadPrescriptions(selectedPatientId);
      }
      const source = patientOptions ?? patients;
      if (source.length > 0) {
        await syncAllPrescriptionsData(source);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const loadPrescriptions = async (patientId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPrescriptions(patientId);
      const sorted = data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPrescriptions(sorted);
      setPrescriptionsByPatient((prev) => ({ ...prev, [patientId]: sorted }));
    } catch (err) {
      setError('Ошибка загрузки назначений');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (id: number) => {
    setSelectedPatientId(id);
    setSelectedPrescriptionIds([]);
    setExpandedPrescriptionId(null);
    loadPrescriptions(id);
    onPatientSelect?.(id);
  };

  const handleCheckboxChange = (prescriptionId: number) => {
    setSelectedPrescriptionIds(prev => 
      prev.includes(prescriptionId)
        ? prev.filter(id => id !== prescriptionId)
        : [...prev, prescriptionId]
    );
  };

  const handleFilterChange = (status: typeof filterStatus) => {
    setFilterStatus(status);
    setSelectedPrescriptionIds([]);
    setExpandedPrescriptionId(null);
  };

  const handleExecuteSelected = async () => {
    if (selectedPrescriptionIds.length === 0) return;
    
    if (!(await appConfirm(`Выполнить ${selectedPrescriptionIds.length} назначений?`))) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const promises = selectedPrescriptionIds.map(id => 
        apiService.executePrescription(id)
      );
      
      await Promise.all(promises);
      
      setSuccessMessage(`✅ Выполнено ${selectedPrescriptionIds.length} назначений`);
      setSelectedPrescriptionIds([]);
      setExpandedPrescriptionId(null);
      
      if (selectedPatientId) {
        await loadPrescriptions(selectedPatientId);
      }
      const source = patientOptions ?? patients;
      if (source.length > 0) {
        await syncAllPrescriptionsData(source);
      }
    } catch (err) {
      setError('Ошибка выполнения назначений');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPrescription = async (prescriptionId: number, prescriptionName: string) => {
    if (!(await appConfirm(`Отменить назначение "${prescriptionName}"?`, { danger: true }))) return;

    setLoading(true);
    setError(null);

    try {
      await apiService.cancelPrescription(prescriptionId);
      
      setSuccessMessage(`✅ Назначение "${prescriptionName}" отменено`);
      setExpandedPrescriptionId(null);
      
      if (selectedPatientId) {
        await loadPrescriptions(selectedPatientId);
      }
      const source = patientOptions ?? patients;
      if (source.length > 0) {
        await syncAllPrescriptionsData(source);
      }
    } catch (err) {
      setError('Ошибка отмены назначения');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (prescriptionId: number) => {
    setExpandedPrescriptionId(prev => prev === prescriptionId ? null : prescriptionId);
  };

  // Переводы типов назначений
  const getPrescriptionTypeLabel = (type: string) => {
    switch (type) {
      case 'PROCEDURE':
        return '💉';
      case 'MEASUREMENT':
        return '📊';
      case 'NOTE':
        return '📝';
      default:
        return '❓';
    }
  };

  const getPrescriptionStatusClass = (status: string, scope: 'av' | 'rap' = 'av') => {
    const prefix = scope === 'rap' ? 'rap-status' : 'av-status';
    switch (status) {
      case 'ACTIVE': return `${prefix}-active`;
      case 'COMPLETED': return `${prefix}-completed`;
      case 'CANCELLED': return `${prefix}-cancelled`;
      default: return '';
    }
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (p.prescription_type === 'NOTE') return false;
    if (filterStatus === 'all') return true;
    const status = (p.status || '').toLowerCase();
    return status === filterStatus;
  });

  if (variant === 'roomPanel') {
    return (
      <div className="rap-root">
        <div className="rap-toolbar">
          <div className="rap-filters">
            <button
              type="button"
              className={`rap-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              Все ({prescriptions.length})
            </button>
            <button
              type="button"
              className={`rap-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => handleFilterChange('active')}
            >
              Активные ({prescriptions.filter((p) => p.status === 'ACTIVE').length})
            </button>
            <button
              type="button"
              className={`rap-filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => handleFilterChange('completed')}
            >
              Выполненные ({prescriptions.filter((p) => p.status === 'COMPLETED').length})
            </button>
            <button
              type="button"
              className={`rap-filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
              onClick={() => handleFilterChange('cancelled')}
            >
              Отменённые ({prescriptions.filter((p) => p.status === 'CANCELLED').length})
            </button>
          </div>
          <button
            type="button"
            className={`rap-execute-btn ${selectedPrescriptionIds.length > 0 ? 'active' : ''}`}
            onClick={handleExecuteSelected}
            disabled={selectedPrescriptionIds.length === 0 || loading}
          >
            Подтвердить ({selectedPrescriptionIds.length})
          </button>
        </div>

        {error && <div className="rap-flash rap-flash--error">{error}</div>}
        {successMessage && <div className="rap-flash rap-flash--success">{successMessage}</div>}

        <div className="rap-body">
          {loading ? (
            <div className="rap-loading">Загрузка…</div>
          ) : selectedPatientId ? (
            filteredPrescriptions.length > 0 ? (
              <div className="rap-list">
                {filteredPrescriptions.map((p) => (
                  <React.Fragment key={p.id}>
                    <div
                      className={`rap-item ${getPrescriptionStatusClass(p.status, 'rap')} ${expandedPrescriptionId === p.id ? 'expanded' : ''}`}
                      onClick={() => handleToggleExpand(p.id)}
                    >
                      <div className="rap-item-top">
                        <input
                          type="checkbox"
                          checked={selectedPrescriptionIds.includes(p.id)}
                          onChange={() => handleCheckboxChange(p.id)}
                          disabled={p.status !== 'ACTIVE'}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="rap-item-icon" aria-hidden>
                          {getPrescriptionTypeLabel(p.prescription_type)}
                        </span>
                        <div className="rap-item-main">
                          <div className="rap-item-name" title={p.name}>
                            {p.name}
                          </div>
                          <div className="rap-item-freq">
                            {p.frequency || '—'} · {prescriptionProgress(p)}
                          </div>
                          {p.notes && (
                            <div className="rap-item-notes" title={p.notes}>
                              {p.notes}
                            </div>
                          )}
                        </div>
                        <div className="rap-item-aside">
                          <span
                            className={`rap-item-status ${getPrescriptionStatusClass(p.status, 'rap')}`}
                          >
                            {getPrescriptionStatusLabel(p.status)}
                          </span>
                          {p.status === 'ACTIVE' && (
                            <button
                              type="button"
                              className="rap-cancel-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelPrescription(p.id, p.name);
                              }}
                              title="Отменить"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedPrescriptionId === p.id && (
                      <div className="rap-detail">
                        <div className="rap-detail-row">
                          <span className="rap-detail-label">Название</span>
                          <span className="rap-detail-value">{p.name}</span>
                        </div>
                        {p.notes && (
                          <div className="rap-detail-row">
                            <span className="rap-detail-label">Примечания</span>
                            <span className="rap-detail-value">{p.notes}</span>
                          </div>
                        )}
                        <div className="rap-detail-row">
                          <span className="rap-detail-label">Частота</span>
                          <span className="rap-detail-value">{p.frequency || '—'}</span>
                        </div>
                        <div className="rap-detail-row">
                          <span className="rap-detail-label">Статус</span>
                          <span
                            className={`rap-detail-value ${getPrescriptionStatusClass(p.status, 'rap')}`}
                          >
                            {getPrescriptionStatusLabel(p.status)}
                          </span>
                        </div>
                        <div className="rap-detail-row">
                          <span className="rap-detail-label">Создано</span>
                          <span className="rap-detail-value">
                            {new Date(p.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="rap-empty">
                {filterStatus === 'all'
                  ? 'У пациента нет назначений'
                  : `Нет назначений со статусом «${filterStatus === 'active' ? 'Активно' : filterStatus === 'completed' ? 'Выполнено' : 'Отменено'}»`}
              </div>
            )
          ) : (
            <div className="rap-empty">Выберите занятую койку</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="av-page">
      {error && <div className="av-flash av-flash--error">{error}</div>}
      {successMessage && <div className="av-flash av-flash--success">{successMessage}</div>}

      <div className="av-layout">
        <aside className="av-sidebar-panel">
          <div className="av-filters">
            <button
              type="button"
              className={`av-filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              Все
            </button>
            <button
              type="button"
              className={`av-filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => handleFilterChange('active')}
            >
              Активные
            </button>
            <button
              type="button"
              className={`av-filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => handleFilterChange('completed')}
            >
              Выполненные
            </button>
            <button
              type="button"
              className={`av-filter-tab ${filterStatus === 'cancelled' ? 'active' : ''}`}
              onClick={() => handleFilterChange('cancelled')}
            >
              Отмененные
            </button>
          </div>

          <div className="av-patients-list">
            {patients
              .filter((patient) =>
                patientMatchesFilter(patient.id, filterStatus, prescriptionsByPatient),
              )
              .map((patient) => {
              const { room, bed } = getPatientRoomAndBed(patient, rooms);
              return (
                <button
                  key={patient.id}
                  type="button"
                  className={`av-patient-card ${selectedPatientId === patient.id ? 'selected' : ''}`}
                  onClick={() => handlePatientClick(patient.id)}
                >
                  <div className="av-patient-name">{patient.full_name}</div>
                  <div className="av-patient-meta">
                    {room ? `Палата ${room.number}` : 'Палата —'}
                    {bed ? `, койка ${bed.number}` : ''}
                  </div>
                  <div className="av-patient-meta">
                    Поступил: {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                  </div>
                </button>
              );
            })}
            {patients.filter((patient) =>
              patientMatchesFilter(patient.id, filterStatus, prescriptionsByPatient),
            ).length === 0 && (
              <div className="av-empty av-empty--compact">Нет пациентов для выбранного фильтра</div>
            )}
          </div>
        </aside>

        <section className="av-main-panel">
          <div className="av-main-head">
            <div>
              <h2 className="av-main-title">Назначения пациентов</h2>
              <p className="av-main-subtitle">всего назначений: {totalPrescriptionsCount}</p>
            </div>
            <div className="av-main-head-actions">
              {selectedPrescriptionIds.length > 0 && (
                <button
                  type="button"
                  className="av-btn av-btn-primary"
                  onClick={handleExecuteSelected}
                  disabled={loading}
                >
                  Подтвердить ({selectedPrescriptionIds.length})
                </button>
              )}
              <button
                type="button"
                className="av-btn av-btn-text"
                onClick={() => void handleRefresh()}
                disabled={refreshing || loading}
              >
                <span className="av-btn-icon-mark" aria-hidden>↻</span>
                Обновить
              </button>
            </div>
          </div>

          <div className="av-main-body">
            {loading ? (
              <div className="av-empty">Загрузка…</div>
            ) : selectedPatientId ? (
              filteredPrescriptions.length > 0 ? (
                <div className="av-rx-list">
                  {filteredPrescriptions.map((p) => {
                    const progress = getProgressMeta(p);
                    return (
                    <div
                      key={p.id}
                      className={`av-rx-row ${getPrescriptionStatusClass(p.status)}`}
                    >
                      <label
                        className="av-rx-check"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={
                            p.status === 'COMPLETED' || selectedPrescriptionIds.includes(p.id)
                          }
                          onChange={() => handleCheckboxChange(p.id)}
                          disabled={p.status !== 'ACTIVE'}
                        />
                        <span className="av-rx-check-ui" aria-hidden />
                      </label>

                      <div className="av-rx-body">
                        <div className="av-rx-name" title={p.name}>
                          {p.name}
                        </div>
                        <div className="av-rx-freq">
                          {p.frequency || '—'}
                        </div>
                        <div className="av-rx-date">{formatRxDate(p)}</div>
                      </div>

                      <div className={`av-rx-progress av-rx-progress--${progress.tone}`}>
                        <span className="av-rx-dot" aria-hidden />
                        {progress.label}
                      </div>

                      {p.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="av-rx-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCancelPrescription(p.id, p.name);
                          }}
                          title="Отменить"
                        >
                          ×
                        </button>
                      ) : (
                        <span className="av-rx-remove-spacer" aria-hidden />
                      )}
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="av-empty">
                  {filterStatus === 'all'
                    ? 'У пациента нет назначений'
                    : `Нет назначений со статусом «${
                        filterStatus === 'active'
                          ? 'Активные'
                          : filterStatus === 'completed'
                            ? 'Выполненные'
                            : 'Отмененные'
                      }»`}
                </div>
              )
            ) : (
              <div className="av-empty">Выберите пациента слева</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppointmentsView;