import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Patient, Prescription } from '../../types';
import { prescriptionProgress } from '../../utils/prescriptionPackages';
import { getPrescriptionStatusLabel } from '../../utils/formatters';
import './AppointmentsView.css';
import './RoomAppointmentsPanel.css';

interface AppointmentsViewProps {
  patientId: number | null;
  onPatientSelect?: (patientId: number) => void;
  /** Полная вкладка «Назначения» или панель на экране «Палаты» */
  variant?: 'full' | 'roomPanel';
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  patientId,
  onPatientSelect,
  variant = 'full',
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(patientId);
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<number | null>(null);

  useEffect(() => {
    if (variant === 'full') {
      void loadPatients();
    }
  }, [variant]);

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
    } catch (err) {
      setError('Ошибка загрузки пациентов');
      console.error(err);
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
    
    if (!window.confirm(`Выполнить ${selectedPrescriptionIds.length} назначений?`)) return;

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
        loadPrescriptions(selectedPatientId);
      }
    } catch (err) {
      setError('Ошибка выполнения назначений');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPrescription = async (prescriptionId: number, prescriptionName: string) => {
    if (!window.confirm(`Отменить назначение "${prescriptionName}"?`)) return;

    setLoading(true);
    setError(null);

    try {
      await apiService.cancelPrescription(prescriptionId);
      
      setSuccessMessage(`✅ Назначение "${prescriptionName}" отменено`);
      setExpandedPrescriptionId(null);
      
      if (selectedPatientId) {
        loadPrescriptions(selectedPatientId);
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
      case 'PROCEDURE': return '💉';
      case 'MEASUREMENT': return '📊';
      case 'NOTE': return '📝';
      default: return '❓';
    }
  };

  // Переводы статусов
  const getPrescriptionStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Активно';
      case 'COMPLETED': return '✅ Выполнено';
      case 'CANCELLED': return '❌ Отменено';
      default: return status;
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
    <div className="av-container">
      <div className="av-header">
        <h2>📋 Назначения пациентов</h2>

        <div className="av-controls">
          <div className="av-filters">
            <button 
              className={`av-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              Все ({prescriptions.length})
            </button>
            <button 
              className={`av-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => handleFilterChange('active')}
            >
              Активные ({prescriptions.filter(p => p.status === 'ACTIVE').length})
            </button>
            <button 
              className={`av-filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => handleFilterChange('completed')}
            >
              Выполненные ({prescriptions.filter(p => p.status === 'COMPLETED').length})
            </button>
            <button 
              className={`av-filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
              onClick={() => handleFilterChange('cancelled')}
            >
              Отменённые ({prescriptions.filter(p => p.status === 'CANCELLED').length})
            </button>
          </div>
          
          <button 
            className={`av-execute-btn ${selectedPrescriptionIds.length > 0 ? 'active' : ''}`}
            onClick={handleExecuteSelected}
            disabled={selectedPrescriptionIds.length === 0 || loading}
          >
            ✅ Подтвердить ({selectedPrescriptionIds.length})
          </button>
        </div>
      </div>

      {error && <div className="av-error-message">{error}</div>}
      {successMessage && <div className="av-success-message">{successMessage}</div>}

      <div className="av-layout">
          <div className="av-patients-column">
            <h3>👥 Пациенты</h3>
            <div className="av-patients-list">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`av-patient-item ${selectedPatientId === patient.id ? 'selected' : ''}`}
                  onClick={() => handlePatientClick(patient.id)}
                >
                  <div className="av-patient-info">
                    <div className="av-patient-name">{patient.full_name}</div>
                    <div className="av-patient-meta">
                      {patient.bed_id && <span>Койка #{patient.bed_id}</span>}
                      <span>
                        Поступил:{' '}
                        {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        <div className="av-prescriptions-column">
          <h3>📋 Назначения {selectedPatientId ? 'пациента' : '(выберите пациента)'}</h3>
          
          {loading ? (
            <div className="av-loading">Загрузка...</div>
          ) : selectedPatientId ? (
            filteredPrescriptions.length > 0 ? (
              <div className="av-prescriptions-list">
                {filteredPrescriptions.map(p => (
                  <React.Fragment key={p.id}>
                    <div 
                      className={`av-prescription-item ${getPrescriptionStatusClass(p.status)} ${expandedPrescriptionId === p.id ? 'expanded' : ''}`}
                      onClick={() => handleToggleExpand(p.id)}
                    >
                      <div className="av-presc-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPrescriptionIds.includes(p.id)}
                          onChange={() => handleCheckboxChange(p.id)}
                          disabled={p.status !== 'ACTIVE'}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="av-presc-type">
                        {getPrescriptionTypeLabel(p.prescription_type)}
                      </div>
                      
                      <div className="av-presc-main">
                        <div className="av-presc-name" title={p.name}>
                          {p.name.length > 60 ? `${p.name.substring(0, 60)}...` : p.name}
                        </div>
                        {p.notes && (
                          <div className="av-presc-notes" title={p.notes}>
                            📝 {p.notes.length > 50 ? `${p.notes.substring(0, 50)}...` : p.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="av-presc-meta">
                        <div className="av-presc-freq">
                          {p.frequency || '—'} · {prescriptionProgress(p)}
                        </div>
                        <div className={`av-presc-status ${getPrescriptionStatusClass(p.status)}`}>
                          {getPrescriptionStatusLabel(p.status)}
                        </div>
                      </div>
                      
                      <div className="av-presc-actions">
                        {p.status === 'ACTIVE' && (
                          <button 
                            className="av-cancel-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelPrescription(p.id, p.name);
                            }}
                            title="Отменить"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Раскрытая детальная карточка */}
                    {expandedPrescriptionId === p.id && (
                      <div className="av-prescription-detail">
                        <div className="av-detail-row">
                          <span className="av-detail-label">Полное название:</span>
                          <span className="av-detail-value">{p.name}</span>
                        </div>
                        {p.notes && (
                          <div className="av-detail-row">
                            <span className="av-detail-label">Примечания:</span>
                            <span className="av-detail-value">{p.notes}</span>
                          </div>
                        )}
                        <div className="av-detail-row">
                          <span className="av-detail-label">Частота:</span>
                          <span className="av-detail-value">{p.frequency || '—'}</span>
                        </div>
                        <div className="av-detail-row">
                          <span className="av-detail-label">Статус:</span>
                          <span className={`av-detail-value ${getPrescriptionStatusClass(p.status)}`}>
                            {getPrescriptionStatusLabel(p.status)}
                          </span>
                        </div>
                        <div className="av-detail-row">
                          <span className="av-detail-label">Создано:</span>
                          <span className="av-detail-value">
                            {new Date(p.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="av-empty-list">
                {filterStatus === 'all' 
                  ? 'У пациента нет назначений' 
                  : `Нет назначений со статусом "${filterStatus === 'active' ? 'Активно' : filterStatus === 'completed' ? 'Выполнено' : 'Отменено'}"`}
              </div>
            )
          ) : (
            <div className="av-select-patient">
              <p>👈 Выберите пациента слева</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentsView;