import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Patient, Observation, Procedure, Appointment } from '../../types';
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
  const [activeTab, setActiveTab] = useState<'info' | 'observations' | 'procedures' | 'appointments'>('info');

  // Данные для редактирования
  const [editData, setEditData] = useState<Partial<Patient>>({});

  // Медицинские записи
  const [observations, setObservations] = useState<Observation[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

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
      const [obsData, procData, appData] = await Promise.all([
        apiService.getObservations(patientId),
        apiService.getProcedures(patientId),
        apiService.getAppointments(patientId)
      ]);
      setObservations(obsData);
      setProcedures(procData.data);
      setAppointments(appData.data);
    } catch (err) {
      console.error('Ошибка загрузки медицинских записей:', err);
    }
  };

  const handleInputChange = (field: keyof Partial<Patient>, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // const handleSave = async () => {
  //   if (!patient) return;

  //   try {
  //     await apiService.updatePatient(patient.id, editData);
  //     setPatient(prev => prev ? { ...prev, ...editData } : null);
  //     setEditing(false);
  //     setError(null);
  //   } catch (err) {
  //     setError('Ошибка сохранения данных');
  //     console.error(err);
  //   }
  // };

  const handleArchive = async () => {
    if (!patient) return;
    if (!window.confirm('Вы уверены, что хотите выписать пациента?')) return;

    try {
      await apiService.archivePatient(patient.id);
      alert('Пациент выписан');

      if (onPatientArchived) {
        onPatientArchived();
      }
      
      onClose();
    } catch (err) {
      setError('Ошибка выписки пациента');
      console.error(err);
    }
  };

  if (loading) return <div className="patient-card">Загрузка...</div>;
  if (!patient) return <div className="patient-card">Пациент не найден</div>;

  return (
    <div className="patient-card">
      <div className="card-header">
        <h2>Карточка пациента</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Основная информация */}
      <div className="patient-main-info">
        <div className="info-row">
          <span className="info-label">ФИО:</span>
          {editing ? (
            <input
              type="text"
              value={editData.full_name || ''}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
            />
          ) : (
            <span className="info-value">{patient.full_name}</span>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">Дата рождения:</span>
          {editing ? (
            <input
              type="date"
              value={editData.birth_date || ''}
              onChange={(e) => handleInputChange('birth_date', e.target.value)}
            />
          ) : (
            <span className="info-value">
              {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('ru-RU') : '—'}
            </span>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">Пол:</span>
          {editing ? (
            <select
              value={editData.gender || ''}
              onChange={(e) => handleInputChange('gender', e.target.value)}
            >
              <option value="">—</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          ) : (
            <span className="info-value">{patient.gender || '—'}</span>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">Мед. карта №:</span>
          {editing ? (
            <input
              type="text"
              value={editData.medical_record_number || ''}
              onChange={(e) => handleInputChange('medical_record_number', e.target.value)}
            />
          ) : (
            <span className="info-value">{patient.medical_record_number || '—'}</span>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">Подразделение:</span>
          {editing ? (
            <input
              type="text"
              value={editData.department_name || ''}
              onChange={(e) => handleInputChange('department_name', e.target.value)}
            />
          ) : (
            <span className="info-value">{patient.department_name || '—'}</span>
          )}
        </div>

        <div className="info-row">
          <span className="info-label">Статус:</span>
          <span className={`info-value status-${patient.status}`}>
            {patient.status === 'active' ? 'Активный' : 'Архив'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">Дата поступления:</span>
          <span className="info-value">
            {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
          </span>
        </div>

        {patient.discharge_date && (
          <div className="info-row">
            <span className="info-label">Дата выписки:</span>
            <span className="info-value">
              {new Date(patient.discharge_date).toLocaleDateString('ru-RU')}
            </span>
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="card-actions">
        {editing ? (
          <>
            {/* <button className="btn-primary" onClick={handleSave}>Сохранить</button> */}
            <button className="btn-secondary" onClick={() => setEditing(false)}>Отмена</button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={() => setEditing(true)}>Редактировать</button>
            <button className="btn-danger" onClick={handleArchive}>Выписать</button>
          </>
        )}
      </div>

      {/* Вкладки */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          📋 Информация
        </button>
        <button
          className={`tab-btn ${activeTab === 'observations' ? 'active' : ''}`}
          onClick={() => setActiveTab('observations')}
        >
          🩺 Наблюдения ({observations.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'procedures' ? 'active' : ''}`}
          onClick={() => setActiveTab('procedures')}
        >
          💉 Процедуры ({procedures.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          📅 Назначения ({appointments.length})
        </button>
      </div>

      {/* Контент вкладок */}
      <div className="tab-content">
        {activeTab === 'info' && (
          <div className="info-tab">
            <h3>Дополнительная информация</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">ID пациента:</span>
                <span className="info-value">{patient.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Внешний ID:</span>
                <span className="info-value">{patient.external_id || '—'}</span>
              </div>
              {/* <div className="info-item">
                <span className="info-label">Филиал:</span>
                <span className="info-value">{patient.branch_id || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Подразделение ID:</span>
                <span className="info-value">{patient.department_id || '—'}</span>
              </div> */}
              <div className="info-item">
                <span className="info-label">Койка ID:</span>
                <span className="info-value">{patient.bed_id || '—'}</span>
              </div>
              {/* <div className="info-item">
                <span className="info-label">Создан:</span>
                <span className="info-value">
                  {new Date(patient.created_at).toLocaleString('ru-RU')}
                </span>
              </div> */}
            </div>
          </div>
        )}

        {activeTab === 'observations' && (
          <div className="observations-tab">
            <h3>Наблюдения</h3>
            {observations.length > 0 ? (
              <div className="records-list">
                {observations.map(obs => (
                  <div key={obs.id} className="record-card">
                    <div className="record-header">
                      <span className="record-date">
                        {new Date(obs.record_date).toLocaleDateString('ru-RU')}
                      </span>
                      <span className="record-time">
                        {new Date(obs.created_at).toLocaleTimeString('ru-RU')}
                      </span>
                    </div>
                    <div className="record-body">
                      <div className="vitals">
                        <span>🌡️ {obs.temperature ? `${obs.temperature}°C` : '—'}</span>
                        <span>❤️ {obs.pulse ? `${obs.pulse} уд/мин` : '—'}</span>
                        <span>🩸 {obs.blood_pressure_systolic && obs.blood_pressure_diastolic
                          ? `${obs.blood_pressure_systolic}/${obs.blood_pressure_diastolic}`
                          : '—'}</span>
                      </div>
                      {obs.complaints && (
                        <div className="record-field">
                          <strong>Жалобы:</strong> {obs.complaints}
                        </div>
                      )}
                      {obs.examination && (
                        <div className="record-field">
                          <strong>Обследование:</strong> {obs.examination}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-records">Нет наблюдений</p>
            )}
          </div>
        )}

        {activeTab === 'procedures' && (
          <div className="procedures-tab">
            <h3>Процедуры</h3>
            {procedures.length > 0 ? (
              <div className="records-list">
                {procedures.map(proc => (
                  <div key={proc.id} className="record-card">
                    <div className="record-header">
                      <span className="record-title">{proc.name}</span>
                      <span className={`status-badge ${proc.status}`}>
                        {proc.status}
                      </span>
                    </div>
                    <div className="record-body">
                      {proc.description && (
                        <div className="record-field">
                          <strong>Описание:</strong> {proc.description}
                        </div>
                      )}
                      {proc.scheduled_time && (
                        <div className="record-field">
                          <strong>Запланировано:</strong> {new Date(proc.scheduled_time).toLocaleString('ru-RU')}
                        </div>
                      )}
                      {proc.dosage && (
                        <div className="record-field">
                          <strong>Дозировка:</strong> {proc.dosage}
                        </div>
                      )}
                      {proc.frequency && (
                        <div className="record-field">
                          <strong>Периодичность:</strong> {proc.frequency}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-records">Нет процедур</p>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="appointments-tab">
            <h3>Назначения</h3>
            {appointments.length > 0 ? (
              <div className="records-list">
                {appointments.map(app => (
                  <div key={app.id} className="record-card">
                    <div className="record-header">
                      <span className="record-title">{app.title}</span>
                      <span className={`status-badge ${app.status}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="record-body">
                      {app.description && (
                        <div className="record-field">
                          <strong>Описание:</strong> {app.description}
                        </div>
                      )}
                      {app.appointment_date && (
                        <div className="record-field">
                          <strong>Дата:</strong> {new Date(app.appointment_date).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                      {app.appointment_time && (
                        <div className="record-field">
                          <strong>Время:</strong> {new Date(app.appointment_time).toLocaleTimeString('ru-RU')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-records">Нет назначений</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientCard;