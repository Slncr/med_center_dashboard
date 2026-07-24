import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Patient, Observation, Prescription, PrescriptionPackage, PatientFeatureFlags } from '../../types';
import {
  DEFAULT_FEATURE_FLAGS,
  flagsFromPatient,
  toggleFeatureFlag,
} from '../../utils/patientFlags';
import {
  filterWorkItems,
  formatPackageTitle,
  packageStatusLabel,
  prescriptionProgress,
} from '../../utils/prescriptionPackages';
import TruncateText from '../common/TruncateText';
import PrescriptionPackageModal from './PrescriptionPackageModal';
import { PatientVitalThresholdsForm } from '../bracelet-monitoring';
import type { PatientCardTab } from '../../utils/urlTabs';
import { appAlert, appConfirm } from '../../context/AppDialogContext';
import './PatientCard.css';

interface PatientCardProps {
  patientId: number;
  onClose: () => void;
  onPatientArchived?: () => void;
  /** Только просмотр (архив / выписанные) */
  readOnly?: boolean;
  cardTab?: PatientCardTab;
  onCardTabChange?: (tab: PatientCardTab) => void;
}

const PatientCard: React.FC<PatientCardProps> = ({
  patientId,
  onClose,
  onPatientArchived,
  readOnly = false,
  cardTab,
  onCardTabChange,
}) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalTab, setInternalTab] = useState<PatientCardTab>('observations');
  const resolvedCardTab = cardTab ?? internalTab;
  const activeTab =
    readOnly && (resolvedCardTab === 'statuses' || resolvedCardTab === 'bracelet')
      ? 'observations'
      : resolvedCardTab;
  const setActiveTab = onCardTabChange ?? setInternalTab;
  const [selectedPackage, setSelectedPackage] = useState<PrescriptionPackage | null>(null);
  const [featureFlags, setFeatureFlags] = useState<PatientFeatureFlags>(DEFAULT_FEATURE_FLAGS);

  const [editData, setEditData] = useState<Partial<Patient>>({});
  const [observations, setObservations] = useState<Observation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [packages, setPackages] = useState<PrescriptionPackage[]>([]);

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
      setFeatureFlags(flagsFromPatient(data));
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
      const [obsData, prescData, pkgData] = await Promise.all([
        apiService.getObservations(patientId),
        apiService.getPrescriptions(patientId),
        apiService.getPrescriptionPackages(patientId),
      ]);
      setObservations(obsData);
      setPrescriptions(prescData);
      setPackages(pkgData);
    } catch (err) {
      console.error('Ошибка загрузки медицинских записей:', err);
    }
  };

  const procedureItems = filterWorkItems(prescriptions, 'PROCEDURE');
  const measurementItems = filterWorkItems(prescriptions, 'MEASUREMENT');

  const handleInputChange = (field: keyof Partial<Patient>, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleArchive = async () => {
    if (!patient) return;
    if (!(await appConfirm('Вы уверены, что хотите выписать пациента?', { danger: true }))) return;

    try {
      await apiService.archivePatient(patient.id);
      await appAlert('Пациент выписан');
      if (onPatientArchived) onPatientArchived();
      onClose();
    } catch (err) {
      setError('Ошибка выписки пациента');
      console.error(err);
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

  const getItemStatusLabel = (p: Prescription) => {
    if (p.status === 'COMPLETED') return 'Выполнено';
    if (p.status === 'CANCELLED') return 'Отменено';
    const req = p.executions_required ?? 1;
    const done = p.executions_done ?? 0;
    if (done > 0) return `В процессе (${done}/${req})`;
    return 'Не выполнено';
  };

  const handleFeatureFlagToggle = async (name: keyof PatientFeatureFlags) => {
    const next = toggleFeatureFlag(featureFlags, name);
    setFeatureFlags(next);
    try {
      const updated = await apiService.updatePatientFeatureFlags(patientId, next);
      setPatient(updated);
      setFeatureFlags(flagsFromPatient(updated));
    } catch (err) {
      console.error('Ошибка сохранения статусов:', err);
      setError('Ошибка сохранения статусов пациента');
      if (patient) setFeatureFlags(flagsFromPatient(patient));
    }
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

  const isReadOnly = readOnly || patient.status === 'discharged';

  return (
    <div className="pc-modal-overlay" onClick={onClose}>
      <div className="pc-patient-card" onClick={e => e.stopPropagation()}>
        <div className="pc-card-header">
          <h2>
            Карточка пациента: {patient.full_name}
            {isReadOnly && <span className="pc-readonly-badge">Архив</span>}
          </h2>
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

            {!isReadOnly && (
              <div className="pc-actions">
                <button className="pc-btn pc-btn-primary" onClick={() => setEditing(!editing)}>
                  {editing ? 'Отменить' : 'Редактировать'}
                </button>
                <button className="pc-btn pc-btn-danger" onClick={handleArchive}>Выписать</button>
              </div>
            )}

            {!isReadOnly && editing && (
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
                💉 Процедуры ({procedureItems.length})
              </button>
              <button
                className={`pc-tab-btn ${activeTab === 'measurements' ? 'active' : ''}`}
                onClick={() => setActiveTab('measurements')}
              >
                📊 Измерения ({measurementItems.length})
              </button>
              <button
                className={`pc-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('prescriptions')}
              >
                📋 Назначения ({packages.length})
              </button>
              {!isReadOnly && (
                <button
                  className={`pc-tab-btn ${activeTab === 'statuses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('statuses')}
                >
                  🚩 Статусы
                </button>
              )}
              {!isReadOnly && (
                <button
                  className={`pc-tab-btn ${activeTab === 'bracelet' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bracelet')}
                >
                  ⌚ Браслет
                </button>
              )}
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
                <div className="pc-work-items-list">
                  {procedureItems.length > 0 ? procedureItems.map((p) => (
                    <div key={p.id} className={`pc-work-item pc-status-${p.status.toLowerCase()}`}>
                      <div className="pc-work-item-header">
                        <span className="pc-work-item-name">{p.name}</span>
                        <span className={`pc-work-item-status pc-status-${p.status.toLowerCase()}`}>
                          {getItemStatusLabel(p)}
                        </span>
                      </div>
                      <div className="pc-work-item-meta">
                        <span>Частота: {p.frequency || '—'}</span>
                        <span>Выполнено: {prescriptionProgress(p)}</span>
                      </div>
                      {p.notes && (
                        <div className="pc-work-item-notes">
                          <strong>Примечание:</strong>{' '}
                          <TruncateText text={p.notes} className="pc-work-item-notes-text" />
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="pc-no-records">Нет процедур</div>
                  )}
                </div>
              )}

              {activeTab === 'measurements' && (
                <div className="pc-work-items-list">
                  {measurementItems.length > 0 ? measurementItems.map((p) => (
                    <div key={p.id} className={`pc-work-item pc-status-${p.status.toLowerCase()}`}>
                      <div className="pc-work-item-header">
                        <span className="pc-work-item-name">{p.name}</span>
                        <span className={`pc-work-item-status pc-status-${p.status.toLowerCase()}`}>
                          {getItemStatusLabel(p)}
                        </span>
                      </div>
                      <div className="pc-work-item-meta">
                        <span>Частота: {p.frequency || '—'}</span>
                        <span>Выполнено: {prescriptionProgress(p)}</span>
                      </div>
                      {p.notes && (
                        <div className="pc-work-item-notes">
                          <strong>Примечание:</strong>{' '}
                          <TruncateText text={p.notes} className="pc-work-item-notes-text" />
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="pc-no-records">Нет измерений</div>
                  )}
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="pc-packages-list">
                  {packages.length > 0 ? packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`pc-package-item pkg-status-${pkg.status.toLowerCase()}`}
                      onClick={() => setSelectedPackage(pkg)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedPackage(pkg)}
                    >
                      <span className="pc-package-title">{formatPackageTitle(pkg)}</span>
                      <span className={`pc-package-status pkg-status-${pkg.status.toLowerCase()}`}>
                        {packageStatusLabel(pkg)}
                      </span>
                    </div>
                  )) : (
                    <div className="pc-no-records">Нет пакетов назначений</div>
                  )}
                </div>
              )}

              {!isReadOnly && activeTab === 'statuses' && (
                <div className="pc-statuses-tab">
                  <ul className="pc-status-flags-list">
                    <label className="pc-status-checkbox white">
                      <input
                        type="checkbox"
                        checked={featureFlags.flag_white}
                        onChange={() => void handleFeatureFlagToggle('flag_white')}
                      />
                      <span>Белый — все ок</span>
                    </label>
                    <label className="pc-status-checkbox yellow">
                      <input
                        type="checkbox"
                        checked={featureFlags.flag_yellow}
                        onChange={() => void handleFeatureFlagToggle('flag_yellow')}
                      />
                      <span>Желтый — риск падения</span>
                    </label>
                    <label className="pc-status-checkbox red">
                      <input
                        type="checkbox"
                        checked={featureFlags.flag_red}
                        onChange={() => void handleFeatureFlagToggle('flag_red')}
                      />
                      <span>Красный — аллергия</span>
                    </label>
                    <label className="pc-status-checkbox orange">
                      <input
                        type="checkbox"
                        checked={featureFlags.flag_orange}
                        onChange={() => void handleFeatureFlagToggle('flag_orange')}
                      />
                      <span>Оранжевый — инфекция</span>
                    </label>
                    <label className="pc-status-checkbox green">
                      <input
                        type="checkbox"
                        checked={featureFlags.flag_green}
                        onChange={() => void handleFeatureFlagToggle('flag_green')}
                      />
                      <span>Зеленый — диета</span>
                    </label>
                  </ul>
                </div>
              )}

              {!isReadOnly && activeTab === 'bracelet' && (
                <div className="pc-bracelet-tab">
                  <PatientVitalThresholdsForm
                    patientId={patientId}
                    patientName={patient.full_name}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedPackage && (
        <PrescriptionPackageModal
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)}
        />
      )}
    </div>
  );
};

export default PatientCard;