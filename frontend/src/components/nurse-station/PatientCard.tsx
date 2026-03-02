import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Patient, Observation, Procedure, Prescription } from '../../types';
import './PatientCard.css';

interface PatientCardProps {
  patientId: number;
  onClose: () => void;
  onPatientArchived?: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patientId, onClose, onPatientArchived }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'observations' | 'procedures' | 'prescriptions'>('info');
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<number | null>(null);

  const [editData, setEditData] = useState<Partial<Patient>>({});
  const [observations, setObservations] = useState<Observation[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    loadPatient();
    loadMedicalRecords();
  }, [patientId]);

  const loadPatient = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPatient(patientId);
      setPatient(data);
      setEditData({
        full_name: data.full_name,
        birth_date: data.birth_date,
        gender: data.gender,
        medical_record_number: data.medical_record_number,
        department_name: data.department_name
      });
    } catch (err) {
      setError('Ошибка загрузки данных пациента');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalRecords = async () => {
    try {
      const [obsData, procData, prescData] = await Promise.all([
        apiService.getObservations(patientId),
        apiService.getProcedures(patientId),
        apiService.getPrescriptions(patientId)
      ]);
      setObservations(obsData);
      setProcedures(Array.isArray(procData) ? procData : procData.data || []);
      setPrescriptions(prescData);
    } catch (err) {
      console.error('Ошибка загрузки медицинских записей:', err);
    }
  };

  const handleInputChange = (field: keyof Partial<Patient>, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleArchive = async () => {
    if (!patient) return;
    if (!window.confirm('Вы уверены, что хотите выписать пациента?')) return;

    try {
      await apiService.archivePatient(patient.id);
      alert('Пациент выписан');
      if (onPatientArchived) onPatientArchived();
      onClose();
    } catch (err) {
      setError('Ошибка выписки пациента');
      console.error(err);
    }
  };

  const getPrescriptionTypeLabel = (type: string) => {
    switch (type) {
      case 'PROCEDURE': return '💉';
      case 'MEASUREMENT': return '📊';
      case 'NOTE': return '📝';
      default: return '❓';
    }
  };

  const getPrescriptionStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Активно';
      case 'COMPLETED': return '✅ Выполнено';
      case 'CANCELLED': return '❌ Отменено';
      default: return status;
    }
  };

  const getPatientStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'discharged': return 'Выписан';
      case 'archived': return 'Архив';
      default: return status;
    }
  };

  const togglePrescription = (id: number) => {
    setExpandedPrescriptionId(prev => prev === id ? null : id);
  };

  if (loading) return (
    <div className="pc-modal-overlay" onClick={onClose}>
      <div className="pc-patient-card" onClick={e => e.stopPropagation()}>
        <div className="pc-loading">Загрузка...</div>
      </div>
    </div>
  );
  
  if (!patient) return (
    <div className="pc-modal-overlay" onClick={onClose}>
      <div className="pc-patient-card" onClick={e => e.stopPropagation()}>
        <div className="pc-error">Пациент не найден</div>
      </div>
    </div>
  );

  return (
    <div className="pc-modal-overlay" onClick={onClose}>
      <div className="pc-patient-card" onClick={e => e.stopPropagation()}>
        <div className="pc-card-header">
          <h2>Карточка пациента: {patient.full_name}</h2>
          <button className="pc-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="pc-error-message">{error}</div>}

        <div className="pc-card-content">
          {/* Левая колонка: информация */}
          <div className="pc-info-column">
            <div className="pc-info-section">
              <div className="pc-info-item">
                <span className="pc-info-label">Дата поступления:</span>
                <span className="pc-info-value">{new Date(patient.admission_date).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="pc-info-item">
                <span className="pc-info-label">Статус:</span>
                <span className={`pc-info-value pc-status-${patient.status}`}>
                  {getPatientStatusLabel(patient.status)}
                </span>
              </div>
              <div className="pc-info-item">
                <span className="pc-info-label">Койка:</span>
                <span className="pc-info-value">{patient.bed_id || '—'}</span>
              </div>
              <div className="pc-info-item">
                <span className="pc-info-label">Подразделение:</span>
                <span className="pc-info-value">{patient.department_name || '—'}</span>
              </div>
              <div className="pc-info-item">
                <span className="pc-info-label">Дата рождения:</span>
                <span className="pc-info-value">
                  {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('ru-RU') : '—'}
                </span>
              </div>
              <div className="pc-info-item">
                <span className="pc-info-label">Пол:</span>
                <span className="pc-info-value">{patient.gender || '—'}</span>
              </div>
              {patient.discharge_date && (
                <div className="pc-info-item">
                  <span className="pc-info-label">Дата выписки:</span>
                  <span className="pc-info-value">
                    {new Date(patient.discharge_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>

            <div className="pc-actions">
              <button className="pc-btn pc-btn-primary" onClick={() => setEditing(!editing)}>
                {editing ? 'Отменить' : 'Редактировать'}
              </button>
              <button className="pc-btn pc-btn-danger" onClick={handleArchive}>Выписать</button>
            </div>

            {editing && (
              <div className="pc-edit-form">
                <div className="pc-form-group">
                  <label>ФИО</label>
                  <input
                    type="text"
                    value={editData.full_name || ''}
                    onChange={e => handleInputChange('full_name', e.target.value)}
                  />
                </div>
                <div className="pc-form-group">
                  <label>Подразделение</label>
                  <input
                    type="text"
                    value={editData.department_name || ''}
                    onChange={e => handleInputChange('department_name', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка: вкладки */}
          <div className="pc-records-column">
            <div className="pc-tabs">
              <button
                className={`pc-tab-btn ${activeTab === 'observations' ? 'active' : ''}`}
                onClick={() => setActiveTab('observations')}
              >
                🩺 Наблюдения ({observations.length})
              </button>
              <button
                className={`pc-tab-btn ${activeTab === 'procedures' ? 'active' : ''}`}
                onClick={() => setActiveTab('procedures')}
              >
                💉 Процедуры ({procedures.length})
              </button>
              <button
                className={`pc-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('prescriptions')}
              >
                📋 Назначения ({prescriptions.length})
              </button>
            </div>

            <div className="pc-tab-content">
              {activeTab === 'observations' && (
                <div className="pc-records-list">
                  {observations.length > 0 ? observations.map(obs => (
                    <div key={obs.id} className="pc-record-card">
                      <div className="pc-record-header">
                        <span className="pc-record-date">
                          {new Date(obs.record_date).toLocaleDateString('ru-RU')}
                        </span>
                        <span className="pc-record-time">
                          {new Date(obs.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="pc-record-body">
                        <div className="pc-vitals">
                          <span>🌡️ {obs.temperature ? `${obs.temperature}°C` : '—'}</span>
                          <span>❤️ {obs.pulse ? `${obs.pulse}` : '—'}</span>
                          <span>🩸 {obs.blood_pressure_systolic && obs.blood_pressure_diastolic
                            ? `${obs.blood_pressure_systolic}/${obs.blood_pressure_diastolic}`
                            : '—'}</span>
                        </div>
                        {obs.complaints && (
                          <div className="pc-record-field">
                            <strong>Жалобы:</strong> {obs.complaints}
                          </div>
                        )}
                        {obs.examination && (
                          <div className="pc-record-field">
                            <strong>Обследование:</strong> {obs.examination}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="pc-no-records">Нет наблюдений</div>
                  )}
                </div>
              )}

              {activeTab === 'procedures' && (
                <div className="pc-records-list">
                  {procedures.length > 0 ? procedures.map(proc => (
                    <div key={proc.id} className="pc-record-card">
                      <div className="pc-record-header">
                        <span className="pc-record-title">{proc.name}</span>
                        <span className={`pc-status-badge pc-status-${proc.status.toLowerCase()}`}>
                          {proc.status}
                        </span>
                      </div>
                      <div className="pc-record-body">
                        {proc.description && (
                          <div className="pc-record-field">
                            <strong>Описание:</strong> {proc.description}
                          </div>
                        )}
                        {proc.scheduled_time && (
                          <div className="pc-record-field">
                            <strong>Время:</strong> {new Date(proc.scheduled_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {proc.dosage && (
                          <div className="pc-record-field">
                            <strong>Дозировка:</strong> {proc.dosage}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="pc-no-records">Нет процедур</div>
                  )}
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="pc-prescriptions-list">
                  {prescriptions.length > 0 ? (
                    <>
                      {prescriptions.map(p => (
                        <React.Fragment key={p.id}>
                          <div 
                            className={`pc-prescription-item pc-status-${p.status.toLowerCase()} ${expandedPrescriptionId === p.id ? 'expanded' : ''}`}
                            onClick={() => togglePrescription(p.id)}
                          >
                            <div className="pc-presc-type">
                              {getPrescriptionTypeLabel(p.prescription_type)}
                            </div>
                            <div className="pc-presc-main">
                              <div className="pc-presc-name" title={p.name}>
                                {p.name.length > 60 ? `${p.name.substring(0, 60)}...` : p.name}
                              </div>
                              {p.notes && (
                                <div className="pc-presc-notes" title={p.notes}>
                                  📝 {p.notes.length > 50 ? `${p.notes.substring(0, 50)}...` : p.notes}
                                </div>
                              )}
                            </div>
                            <div className="pc-presc-meta">
                              <div className="pc-presc-freq">{p.frequency || '—'}</div>
                              <div className={`pc-presc-status pc-status-${p.status.toLowerCase()}`}>
                                {p.status === 'ACTIVE' ? 'Активно' : p.status === 'COMPLETED' ? '✅' : '❌'}
                              </div>
                            </div>
                            <div className="pc-presc-toggle">
                              {expandedPrescriptionId === p.id ? '▴' : '▾'}
                            </div>
                          </div>
                          
                          {expandedPrescriptionId === p.id && (
                            <div className="pc-prescription-detail">
                              <div className="pc-detail-row">
                                <span className="pc-detail-label">Полное название:</span>
                                <span className="pc-detail-value">{p.name}</span>
                              </div>
                              {p.notes && (
                                <div className="pc-detail-row">
                                  <span className="pc-detail-label">Примечания:</span>
                                  <span className="pc-detail-value">{p.notes}</span>
                                </div>
                              )}
                              <div className="pc-detail-row">
                                <span className="pc-detail-label">Частота:</span>
                                <span className="pc-detail-value">{p.frequency || '—'}</span>
                              </div>
                              <div className="pc-detail-row">
                                <span className="pc-detail-label">Статус:</span>
                                <span className={`pc-detail-value pc-status-${p.status.toLowerCase()}`}>
                                  {getPrescriptionStatusLabel(p.status)}
                                </span>
                              </div>
                              <div className="pc-detail-row">
                                <span className="pc-detail-label">Создано:</span>
                                <span className="pc-detail-value">
                                  {new Date(p.created_at).toLocaleString('ru-RU')}
                                </span>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  ) : (
                    <div className="pc-no-records">Нет назначений</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;