import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Patient, Prescription } from '../../types';
import './PrescriptionsForm.css';

interface PrescriptionsFormProps {
  onPrescriptionCreated?: () => void;
}

const PrescriptionsForm: React.FC<PrescriptionsFormProps> = ({ onPrescriptionCreated }) => {
  const [activeTab, setActiveTab] = useState<'procedures' | 'measurements'>('procedures');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]); // ✅ Состояние для назначений

  // Состояние для процедур
  const [procedures, setProcedures] = useState([
    { id: 1, name: 'Санитарная обработка и смена белья', selected: false, frequency: 1 },
    { id: 2, name: 'Ванна', selected: false, frequency: 1 },
    { id: 3, name: 'Перевязка', selected: false, frequency: 1 },
    { id: 4, name: 'Проверка на педикулёз/чесотку', selected: false, frequency: 1 },
    { id: 5, name: 'Установка/контроль ПВК', selected: false, frequency: 1 },
    { id: 6, name: 'Другая процедура', selected: false, frequency: 1, customName: '' }
  ]);

  // Состояние для измерений
  const [measurements, setMeasurements] = useState({
    temperature: { selected: false, frequency: 1 },
    pulse: { selected: false, frequency: 1 },
    blood_pressure: { selected: false, frequency: 1 },
    respiration_rate: { selected: false, frequency: 1 },
    spO2: { selected: false, frequency: 1 },
    weight: { selected: false, frequency: 1 },
    fluid_intake_oral: { selected: false, frequency: 1 },
    fluid_intake_iv: { selected: false, frequency: 1 },
    urine_output: { selected: false, frequency: 1 },
    bowel_movement: { selected: false, frequency: 1 }
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  // ✅ Эффект для загрузки назначений при выборе пациента
  useEffect(() => {
    if (selectedPatientId) {
      loadPrescriptions(selectedPatientId);
    } else {
      setPrescriptions([]);
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

  // ✅ Загрузка назначений для выбранного пациента
  const loadPrescriptions = async (patientId: number) => {
    try {
      const data = await apiService.getPrescriptions(patientId);
      setPrescriptions(data);
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
      // Не показываем ошибку пользователю — просто оставляем список пустым
    }
  };

  const resetAllMeasurements = () => {
    setMeasurements({
      temperature: { selected: false, frequency: 1 },
      pulse: { selected: false, frequency: 1 },
      blood_pressure: { selected: false, frequency: 1 },
      respiration_rate: { selected: false, frequency: 1 },
      spO2: { selected: false, frequency: 1 },
      weight: { selected: false, frequency: 1 },
      fluid_intake_oral: { selected: false, frequency: 1 },
      fluid_intake_iv: { selected: false, frequency: 1 },
      urine_output: { selected: false, frequency: 1 },
      bowel_movement: { selected: false, frequency: 1 }
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
      // === 1. Создаём ВСЕ выбранные процедуры (независимо от вкладки) ===
      const selectedProcs = procedures.filter(p => p.selected);
      for (const proc of selectedProcs) {
        await apiService.createPrescription({
          patient_id: selectedPatientId,
          prescription_type: 'PROCEDURE',
          name: proc.customName || proc.name,
          frequency: `${proc.frequency} раз/день`,
          notes: notes.trim() || undefined,
          status: 'ACTIVE'
        });
      }

      // === 2. Создаём ВСЕ выбранные измерения (независимо от вкладки) ===
      const selectedMeasurements = Object.entries(measurements)
        .filter(([_, v]) => v.selected)
        .map(([key]) => key);

      if (selectedMeasurements.length > 0) {
        await apiService.createPrescription({
          patient_id: selectedPatientId,
          prescription_type: 'MEASUREMENT',
          name: `Измерения: ${selectedMeasurements.join(', ')}`,
          frequency: 'ежедневно',
          notes: notes.trim() || 'Рутинные измерения',
          status: 'ACTIVE'
        });
      }

      // === 3. Создаём общие примечания (если есть) ===
      if (notes.trim()) {
        await apiService.createPrescription({
          patient_id: selectedPatientId,
          prescription_type: 'NOTE',
          name: 'Общие примечания',
          frequency: 'однократно',
          notes: notes.trim(),
          status: 'ACTIVE'
        });
      }

      setSuccessMessage('Назначения успешно созданы!');
      
      // ✅ После создания — перезагружаем список назначений
      await loadPrescriptions(selectedPatientId);
      
      if (onPrescriptionCreated) {
        onPrescriptionCreated();
      }

      // Сброс формы
      setProcedures(prev => prev.map(p => ({ ...p, selected: false, customName: '' })));
      resetAllMeasurements();
      setNotes('');
    } catch (err) {
      setError('Ошибка создания назначений');
      console.error(err);
    } finally {
      setLoading(false);
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
                onChange={(e) => setSelectedPatientId(Number(e.target.value))}
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
                        <div className="frequency-input">
                          <label>Раз в день:</label>
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={value.frequency}
                            onChange={(e) => handleMeasurementFrequency(key as keyof typeof measurements, Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Примечания */}
            <div className="form-section">
              <h3>3. Примечания</h3>
              <textarea
                placeholder="Дополнительные инструкции для медперсонала..."
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

        {/* Правая колонка: список назначений */}
        <div className="prescriptions-list-column">
          <h3>📋 Назначения пациента</h3>
          
          {!selectedPatientId ? (
            <div className="no-patient-selected">
              <p>Выберите пациента, чтобы увидеть его назначения</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="empty-list">
              <p>У пациента пока нет назначений</p>
            </div>
          ) : (
            <div className="prescriptions-grid">
              {prescriptions.map(p => (
                <div key={p.id} className={`prescription-card status-${p.status.toLowerCase()}`}>
                  <div className="prescription-header">
                    <span className={`type-badge type-${p.prescription_type.toLowerCase()}`}>
                      {p.prescription_type === 'PROCEDURE' && '💉'}
                      {p.prescription_type === 'MEASUREMENT' && '📊'}
                      {p.prescription_type === 'NOTE' && '📝'}
                      {p.prescription_type.toLowerCase()}
                    </span>
                    <span className={`status-badge ${p.status.toLowerCase()}`}>
                      {p.status === 'ACTIVE' && 'Активно'}
                      {p.status === 'COMPLETED' && 'Выполнено'}
                      {p.status === 'CANCELLED' && 'Отменено'}
                    </span>
                  </div>
                  
                  <div className="prescription-body">
                    <h4>{p.name}</h4>
                    
                    {p.frequency && (
                      <div className="prescription-detail">
                        <strong>Частота:</strong> {p.frequency}
                      </div>
                    )}
                    
                    {p.notes && (
                      <div className="prescription-detail notes">
                        <strong>Примечания:</strong> {p.notes}
                      </div>
                    )}
                    
                    <div className="prescription-meta">
                      <small>Создано: {new Date(p.created_at).toLocaleString('ru-RU')}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionsForm;