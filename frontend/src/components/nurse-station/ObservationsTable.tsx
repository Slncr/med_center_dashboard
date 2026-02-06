import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Observation } from '../../types';
import './ObservationsTable.css';

interface ObservationsTableProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
}

const ObservationsTable: React.FC<ObservationsTableProps> = ({ patientId }) => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State для формы
  const [formData, setFormData] = useState({
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    pulse: '',
    complaints: '',
    examination: '' 
  });

  // State для редактирования
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Observation>>({});

  // Загрузка наблюдений при выборе пациента
  useEffect(() => {
    if (patientId) {
      loadObservations(patientId);
    } else {
      setObservations([]);
    }
  }, [patientId]);

  const loadObservations = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getObservations(id);
      setObservations(data);
    } catch (err) {
      setError('Ошибка загрузки наблюдений');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    try {
      const newObservation = await apiService.createObservation({
        patient_id: patientId,
        record_date: new Date().toISOString().split('T')[0],
        temperature: parseFloat(formData.temperature) || null,
        blood_pressure_systolic: parseInt(formData.blood_pressure_systolic) || null,
        blood_pressure_diastolic: parseInt(formData.blood_pressure_diastolic) || null,
        pulse: parseInt(formData.pulse) || null,
        complaints: formData.complaints || null,
        examination: formData.examination || null
      });

      setObservations(prev => [newObservation, ...prev]); // ✅ Новое сверху
      setFormData({
        temperature: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        pulse: '',
        complaints: '',
        examination: ''
      });
    } catch (err) {
      setError('Ошибка добавления наблюдения');
      console.error(err);
    }
  };

  // Начать редактирование
  const startEditing = (obs: Observation) => {
    setEditingId(obs.id);
    setEditData({
      temperature: obs.temperature,
      blood_pressure_systolic: obs.blood_pressure_systolic,
      blood_pressure_diastolic: obs.blood_pressure_diastolic,
      pulse: obs.pulse,
      complaints: obs.complaints,
      examination: obs.examination
    });
  };

  // Изменить поле при редактировании
  const handleEditChange = (field: keyof Partial<Observation>, value: any) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Сохранить изменения
  const saveEdit = async () => {
    if (editingId === null) return;

    try {
      const updatedObs = await apiService.updateObservation(editingId, editData);
      
      setObservations(prev =>
        prev.map(obs => (obs.id === editingId ? updatedObs : obs))
      );
      setEditingId(null);
      setEditData({});
    } catch (err) {
      setError('Ошибка обновления наблюдения');
      console.error(err);
    }
  };

  // Отменить редактирование
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Удалить наблюдение
  const deleteObservation = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это наблюдение?')) return;

    try {
      await apiService.deleteObservation(id);
      setObservations(prev => prev.filter(obs => obs.id !== id));
    } catch (err) {
      setError('Ошибка удаления наблюдения');
      console.error(err);
    }
  };

  if (!patientId) {
    return (
      <div className="observations-table">
        <h2>Наблюдения за пациентами</h2>
        <p>Выберите пациента для просмотра и добавления наблюдений</p>
      </div>
    );
  }

  return (
    <div className="observations-table">
      <h2>Наблюдения за пациентом #{patientId}</h2>

      {/* Форма добавления */}
      <div className="observation-form-container">
        <h3>Добавить новое наблюдение</h3>
        <form onSubmit={handleSubmit} className="observation-form">
          <div className="form-row">
            <div className="form-group">
              <label>Темп. (°C)</label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                value={formData.temperature}
                onChange={handleInputChange}
                placeholder="36.6"
              />
            </div>
            <div className="form-group">
              <label>Давл. сист.</label>
              <input
                type="number"
                name="blood_pressure_systolic"
                value={formData.blood_pressure_systolic}
                onChange={handleInputChange}
                placeholder="120"
              />
            </div>
            <div className="form-group">
              <label>Давл. диаст.</label>
              <input
                type="number"
                name="blood_pressure_diastolic"
                value={formData.blood_pressure_diastolic}
                onChange={handleInputChange}
                placeholder="80"
              />
            </div>
            <div className="form-group">
              <label>Пульс</label>
              <input
                type="number"
                name="pulse"
                value={formData.pulse}
                onChange={handleInputChange}
                placeholder="72"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Жалобы</label>
              <textarea
                name="complaints"
                value={formData.complaints}
                onChange={handleInputChange}
                placeholder="Например: головная боль..."
              />
            </div>
            <div className="form-group">
              <label>Обследование</label>
              <textarea
                name="examination"
                value={formData.examination}
                onChange={handleInputChange}
                placeholder="Объективный осмотр..."
              />
            </div>
          </div>
          <button type="submit" className="submit-btn">Добавить</button>
        </form>
      </div>

      {/* Таблица */}
      {loading && <p>Загрузка...</p>}
      {error && <div className="error-message">{error}</div>}

      {observations.length > 0 ? (
        <div className="observations-list">
          <table className="observations-table-content">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Темп.</th>
                <th>Давл. сист.</th>
                <th>Давл. диаст.</th>
                <th>Пульс</th>
                <th>Жалобы</th>
                <th>Обследование</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {observations.map(obs => (
                <tr key={obs.id}>
                  {editingId === obs.id ? (
                    <>
                      
                      <td>{new Date(obs.record_date).toLocaleDateString('ru-RU')}</td>
                      {/* Температура */}
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={editData.temperature ?? ''}
                          onChange={(e) => handleEditChange('temperature', e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </td>
                      {/* Давл. сист. */}
                      <td>
                        <input
                          type="number"
                          value={editData.blood_pressure_systolic ?? ''}
                          onChange={(e) => handleEditChange('blood_pressure_systolic', e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </td>
                      {/* Давл. диаст. */}
                      <td>
                        <input
                          type="number"
                          value={editData.blood_pressure_diastolic ?? ''}
                          onChange={(e) => handleEditChange('blood_pressure_diastolic', e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </td>
                      {/* Пульс */}
                      <td>
                        <input
                          type="number"
                          value={editData.pulse ?? ''}
                          onChange={(e) => handleEditChange('pulse', e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </td>
                      {/* Жалобы */}
                      <td>
                        <textarea
                          value={editData.complaints ?? ''}
                          onChange={(e) => handleEditChange('complaints', e.target.value || null)}
                        />
                      </td>
                      {/* Обследование */}
                      <td>
                        <textarea
                          value={editData.examination ?? ''}
                          onChange={(e) => handleEditChange('examination', e.target.value || null)}
                        />
                      </td>
                      {/* Действия */}
                      <td>
                        <button onClick={saveEdit}>Сохранить</button>
                        <button onClick={cancelEdit}>Отмена</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{new Date(obs.record_date).toLocaleDateString('ru-RU')}</td>
                      <td>{obs.temperature ? `${obs.temperature}°` : '—'}</td>
                      <td>{obs.blood_pressure_systolic || '—'}</td> {/* Систолическое */}
                      <td>{obs.blood_pressure_diastolic || '—'}</td> {/* Диастолическое */}
                      <td>{obs.pulse ? `${obs.pulse}` : '—'}</td>
                      <td>{obs.complaints || '—'}</td>
                      <td>{obs.examination || '—'}</td>
                      <td>
                        <button onClick={() => startEditing(obs)}>Ред.</button>
                        <button onClick={() => deleteObservation(obs.id)}>Удл.</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-observations">Нет наблюдений</p>
      )}
    </div>
  );
};

export default ObservationsTable;