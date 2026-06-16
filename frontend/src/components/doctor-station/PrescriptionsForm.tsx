import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Patient, Prescription, PrescriptionPackage } from '../../types';
import { formatPackageTitle, packageStatusLabel } from '../../utils/prescriptionPackages';
import PrescriptionPackageModal from '../nurse-station/PrescriptionPackageModal';
import { useUrlTab } from '../../hooks/useUrlSearchState';
import { PRESCRIPTION_FORM_TABS, URL_PARAMS } from '../../utils/urlTabs';
import './PrescriptionsForm.css';

interface PrescriptionsFormProps {
  onPrescriptionCreated?: () => void;
  /** Предвыбор пациента (например, с карточки на вкладке «Пациенты») */
  initialPatientId?: number | null;
  onPatientChange?: (patientId: number | null) => void;
}

const PrescriptionsForm: React.FC<PrescriptionsFormProps> = ({
  onPrescriptionCreated,
  initialPatientId = null,
  onPatientChange,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useUrlTab(URL_PARAMS.subtab, PRESCRIPTION_FORM_TABS, 'procedures');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [packages, setPackages] = useState<PrescriptionPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PrescriptionPackage | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Состояние для процедур
  const [procedures, setProcedures] = useState([
    { id: 1, name: 'Санитарная обработка и смена белья', selected: false, frequency: 1, notes: '' },
    { id: 2, name: 'Ванна', selected: false, frequency: 1, notes: '' },
    { id: 3, name: 'Перевязка', selected: false, frequency: 1, notes: '' },
    { id: 4, name: 'Проверка на педикулёз/чесотку', selected: false, frequency: 1, notes: '' },
    { id: 5, name: 'Установка/контроль ПВК', selected: false, frequency: 1, notes: '' },
    { id: 6, name: 'Другая процедура', selected: false, frequency: 1, customName: '', notes: '' },
  ]);

  const MEASUREMENT_LABELS: Record<string, string> = {
    temperature: 'Температура',
    pulse: 'Пульс',
    blood_pressure: 'Артериальное давление',
    respiration_rate: 'Частота дыхания',
    spO2: 'SpO₂',
    weight: 'Масса тела',
    fluid_intake_oral: 'Выпито жидкости',
    fluid_intake_iv: 'Введено жидкости (парентерально)',
    urine_output: 'Суточное количество мочи',
    bowel_movement: 'Стул'
  };

  // Состояние для измерений
  const [measurements, setMeasurements] = useState({
    temperature: { selected: false, frequency: 1, notes: '' },
    pulse: { selected: false, frequency: 1, notes: '' },
    blood_pressure: { selected: false, frequency: 1, notes: '' },
    respiration_rate: { selected: false, frequency: 1, notes: '' },
    spO2: { selected: false, frequency: 1, notes: '' },
    weight: { selected: false, frequency: 1, notes: '' },
    fluid_intake_oral: { selected: false, frequency: 1, notes: '' },
    fluid_intake_iv: { selected: false, frequency: 1, notes: '' },
    urine_output: { selected: false, frequency: 1, notes: '' },
    bowel_movement: { selected: false, frequency: 1, notes: '' },
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (initialPatientId != null) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      loadPrescriptions(selectedPatientId);
    } else {
      setPackages([]);
    }
  }, [selectedPatientId]);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const patientsData = await apiService.getPatients();
      setPatients(patientsData);
    } catch (err) {
      setError('Ошибка загрузки пациентов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptions = async (patientId: number) => {
    try {
      const data = await apiService.getPrescriptionPackages(patientId);
      setPackages(data);
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
    }
  };

  const resetAllMeasurements = () => {
    setMeasurements({
      temperature: { selected: false, frequency: 1, notes: '' },
      pulse: { selected: false, frequency: 1, notes: '' },
      blood_pressure: { selected: false, frequency: 1, notes: '' },
      respiration_rate: { selected: false, frequency: 1, notes: '' },
      spO2: { selected: false, frequency: 1, notes: '' },
      weight: { selected: false, frequency: 1, notes: '' },
      fluid_intake_oral: { selected: false, frequency: 1, notes: '' },
      fluid_intake_iv: { selected: false, frequency: 1, notes: '' },
      urine_output: { selected: false, frequency: 1, notes: '' },
      bowel_movement: { selected: false, frequency: 1, notes: '' },
    });
  };

  const handleProcedureToggle = (id: number) => {
    setProcedures(prev => prev.map(proc => 
      proc.id === id ? { ...proc, selected: !proc.selected } : proc
    ));
  };

  const handleProcedureFrequency = (id: number, freq: number) => {
    setProcedures(prev => prev.map(proc => 
      proc.id === id ? { ...proc, frequency: Math.max(1, Math.min(24, freq)) } : proc
    ));
  };

  const handleMeasurementToggle = (field: keyof typeof measurements) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: { ...prev[field], selected: !prev[field].selected }
    }));
  };

  const handleMeasurementFrequency = (field: keyof typeof measurements, freq: number) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: { ...prev[field], frequency: Math.max(1, Math.min(24, freq)) }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Выберите пациента');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const batch: Array<{
        prescription_type: 'PROCEDURE' | 'MEASUREMENT';
        name: string;
        frequency?: string;
        executions_required?: number;
        notes?: string;
        status?: 'ACTIVE';
      }> = [];

      const selectedProcs = procedures.filter(p => p.selected);
      for (const proc of selectedProcs) {
        batch.push({
          prescription_type: 'PROCEDURE',
          name: proc.customName || proc.name,
          frequency: `${proc.frequency} раз/день`,
          executions_required: proc.frequency,
          notes: proc.notes.trim() || undefined,
          status: 'ACTIVE',
        });
      }

      for (const [key, value] of Object.entries(measurements)) {
        if (!value.selected) continue;
        batch.push({
          prescription_type: 'MEASUREMENT',
          name: MEASUREMENT_LABELS[key] || key,
          frequency: `${value.frequency} раз/день`,
          executions_required: value.frequency,
          notes: value.notes.trim() || undefined,
          status: 'ACTIVE',
        });
      }

      if (batch.length === 0) {
        setError('Выберите хотя бы одну процедуру или измерение');
        setLoading(false);
        return;
      }

      await apiService.createPrescriptionsBatch(selectedPatientId, {
        general_notes: notes.trim() || undefined,
        prescriptions: batch,
      });

      setSuccessMessage('Назначения успешно созданы!');
      await loadPrescriptions(selectedPatientId);
      
      if (onPrescriptionCreated) {
        onPrescriptionCreated();
      }

      // Сброс формы
      setProcedures(prev => prev.map(p => ({ ...p, selected: false, customName: '', notes: '' })));
      resetAllMeasurements();
      setNotes('');
    } catch (err) {
      setError('Ошибка создания назначений');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Обработчик открытия модалки
  const handleOpenDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
  };

  // ✅ Обработчик закрытия модалки
  const handleCloseDetails = () => {
    setSelectedPrescription(null);
  };

  const canCancelPrescription = (p: Prescription): boolean =>
    p.status === 'ACTIVE' && user != null && p.created_by === user.id;

  const handleCancelPrescription = async (p: Prescription) => {
    if (!canCancelPrescription(p)) return;
    if (!window.confirm(`Отменить назначение «${p.name}»?`)) return;

    setCancellingId(p.id);
    setError(null);
    try {
      await apiService.cancelPrescription(p.id);
      if (selectedPatientId) {
        await loadPrescriptions(selectedPatientId);
      }
      if (selectedPrescription?.id === p.id) {
        setSelectedPrescription(null);
      }
      setSuccessMessage(`Назначение «${p.name}» отменено`);
      onPrescriptionCreated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(typeof msg === 'string' ? msg : 'Не удалось отменить назначение');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading && patients.length === 0) {
    return <div className="prescriptions-form">Загрузка...</div>;
  }

  return (
    <div className="prescriptions-form">
      <h2>📋 Создание назначений</h2>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="prescriptions-layout">
        {/* Левая колонка: форма */}
        <div className="prescriptions-form-column">
          {/* Вкладки */}
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'procedures' ? 'active' : ''}`}
              onClick={() => setActiveTab('procedures')}
            >
              💉 Процедуры
            </button>
            <button 
              className={`tab-btn ${activeTab === 'measurements' ? 'active' : ''}`}
              onClick={() => setActiveTab('measurements')}
            >
              📊 Измерения
            </button>
          </div>

          <form onSubmit={handleSubmit} className="prescription-form">
            {/* Выбор пациента */}
            <div className="form-section">
              <h3>1. Выберите пациента</h3>
              <select
                value={selectedPatientId || ''}
                onChange={(e) => {
                  const nextId = e.target.value ? Number(e.target.value) : null;
                  setSelectedPatientId(nextId);
                  onPatientChange?.(nextId);
                }}
                required
              >
                <option value="">— Выберите пациента —</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} {p.bed_id ? `(койка #${p.bed_id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Процедуры */}
            {activeTab === 'procedures' && (
              <div className="form-section">
                <h3>2. Выберите процедуры</h3>
                <div className="checkbox-grid">
                  {procedures.map(proc => (
                    <div key={proc.id} className="checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={proc.selected}
                          onChange={() => handleProcedureToggle(proc.id)}
                        />
                        <span>{proc.name}</span>
                      </label>
                      {proc.selected && (
                        <>
                          <div className="frequency-input">
                            <label>Раз в день:</label>
                            <input
                              type="number"
                              min="1"
                              max="24"
                              value={proc.frequency}
                              onChange={(e) => handleProcedureFrequency(proc.id, Number(e.target.value))}
                            />
                          </div>
                          <input
                            type="text"
                            className="item-notes-input"
                            placeholder="Примечание к процедуре"
                            value={proc.notes}
                            onChange={(e) =>
                              setProcedures((prev) =>
                                prev.map((p) =>
                                  p.id === proc.id ? { ...p, notes: e.target.value } : p,
                                ),
                              )
                            }
                          />
                        </>
                      )}
                      {proc.id === 6 && proc.selected && (
                        <input
                          type="text"
                          placeholder="Название процедуры"
                          value={proc.customName}
                          onChange={(e) => setProcedures(prev => 
                            prev.map(p => p.id === 6 ? { ...p, customName: e.target.value } : p)
                          )}
                          className="custom-name-input"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Измерения */}
            {activeTab === 'measurements' && (
              <div className="form-section">
                <h3>2. Выберите измерения</h3>
                <div className="checkbox-grid">
                  {Object.entries(measurements).map(([key, value]) => (
                    <div key={key} className="checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={value.selected}
                          onChange={() => handleMeasurementToggle(key as keyof typeof measurements)}
                        />
                        <span>
                          {key === 'temperature' && '🌡️ Температура'}
                          {key === 'pulse' && '❤️ Пульс'}
                          {key === 'blood_pressure' && '🩸 АД'}
                          {key === 'respiration_rate' && '🌬️ Частота дыхания'}
                          {key === 'spO2' && '🩺 SpO₂'}
                          {key === 'weight' && '⚖️ Вес'}
                          {key === 'fluid_intake_oral' && '💧 Выпито жидкости'}
                          {key === 'fluid_intake_iv' && '💉 Введено жидкости (парентерально)'}
                          {key === 'urine_output' && '🚽 Суточное количество мочи'}
                          {key === 'bowel_movement' && '💩 Стул'}
                        </span>
                      </label>
                      {value.selected && (
                        <>
                          <div className="frequency-input">
                            <label>Раз в день:</label>
                            <input
                              type="number"
                              min="1"
                              max="24"
                              value={value.frequency}
                              onChange={(e) =>
                                handleMeasurementFrequency(
                                  key as keyof typeof measurements,
                                  Number(e.target.value),
                                )
                              }
                            />
                          </div>
                          <input
                            type="text"
                            className="item-notes-input"
                            placeholder="Примечание к измерению"
                            value={value.notes}
                            onChange={(e) =>
                              setMeasurements((prev) => ({
                                ...prev,
                                [key]: { ...prev[key as keyof typeof measurements], notes: e.target.value },
                              }))
                            }
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Примечания */}
            <div className="form-section">
              <h3>3. Общие примечания</h3>
              <textarea
                placeholder="Общие инструкции ко всему назначению (не к отдельной процедуре)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <button type="submit" disabled={loading || !selectedPatientId}>
              {loading ? 'Создание...' : '✅ Создать назначения'}
            </button>
          </form>
        </div>

        {/* Правая колонка: компактный список назначений */}
        <div className="prescriptions-list-column">
          <h3>📋 Назначения пациента</h3>
          
          {!selectedPatientId ? (
            <div className="pf-no-patient-selected">
              <p>Выберите пациента, чтобы увидеть его назначения</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="empty-list">
              <p>У пациента пока нет назначений</p>
            </div>
          ) : (
            <div className="prescriptions-compact-list">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`prescription-item status-${pkg.status.toLowerCase()}`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <div className="prescription-item-body">
                    <div className="prescription-item-name">{formatPackageTitle(pkg)}</div>
                    {pkg.general_notes && (
                      <div className="prescription-item-meta">
                        <span className="notes-indicator">📝 Общие примечания</span>
                      </div>
                    )}
                  </div>
                  <div className="prescription-item-header">
                    <span className="status-badge">{packageStatusLabel(pkg)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPackage && (
        <PrescriptionPackageModal
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)}
        />
      )}

      {selectedPrescription && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Детали назначения</h3>
              <button className="modal-close-btn" onClick={handleCloseDetails}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="prescription-detail-row">
                <span className="label">Тип:</span>
                <span className="value">
                  <span className={`type-badge type-${selectedPrescription.prescription_type.toLowerCase()}`}>
                    {selectedPrescription.prescription_type === 'PROCEDURE' && '💉 Процедура'}
                    {selectedPrescription.prescription_type === 'MEASUREMENT' && '📊 Измерение'}
                    {selectedPrescription.prescription_type === 'NOTE' && '📝 Примечание'}
                  </span>
                </span>
              </div>

              <div className="prescription-detail-row">
                <span className="label">Название:</span>
                <span className="value bold">{selectedPrescription.name}</span>
              </div>

              {selectedPrescription.frequency && (
                <div className="prescription-detail-row">
                  <span className="label">Частота:</span>
                  <span className="value">{selectedPrescription.frequency}</span>
                </div>
              )}

              {selectedPrescription.dosage && (
                <div className="prescription-detail-row">
                  <span className="label">Дозировка:</span>
                  <span className="value">{selectedPrescription.dosage}</span>
                </div>
              )}

              {selectedPrescription.notes && (
                <div className="prescription-detail-row full-width">
                  <span className="label">Примечания:</span>
                  <div className="notes-box">
                    {selectedPrescription.notes}
                  </div>
                </div>
              )}

              <div className="prescription-detail-row">
                <span className="label">Статус:</span>
                <span className={`status-badge ${selectedPrescription.status.toLowerCase()}`}>
                  {selectedPrescription.status === 'ACTIVE' && 'Активно'}
                  {selectedPrescription.status === 'COMPLETED' && 'Выполнено'}
                  {selectedPrescription.status === 'CANCELLED' && 'Отменено'}
                </span>
              </div>

              <div className="prescription-detail-row">
                <span className="label">Дата создания:</span>
                <span className="value">
                  {new Date(selectedPrescription.created_at).toLocaleString('ru-RU')}
                </span>
              </div>

              {selectedPrescription.start_date && (
                <div className="prescription-detail-row">
                  <span className="label">Дата начала:</span>
                  <span className="value">
                    {new Date(selectedPrescription.start_date).toLocaleString('ru-RU')}
                  </span>
                </div>
              )}

              {selectedPrescription.end_date && (
                <div className="prescription-detail-row">
                  <span className="label">Дата окончания:</span>
                  <span className="value">
                    {new Date(selectedPrescription.end_date).toLocaleString('ru-RU')}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {selectedPrescription && canCancelPrescription(selectedPrescription) && (
                <button
                  type="button"
                  className="modal-btn-cancel"
                  disabled={cancellingId === selectedPrescription.id}
                  onClick={() => void handleCancelPrescription(selectedPrescription)}
                >
                  {cancellingId === selectedPrescription.id ? 'Отмена…' : 'Отменить назначение'}
                </button>
              )}
              <button type="button" className="modal-btn-close" onClick={handleCloseDetails}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsForm;