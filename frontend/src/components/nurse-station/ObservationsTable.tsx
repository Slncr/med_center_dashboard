import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Observation, Patient, Room } from '../../types';
import './ObservationsTable.css';

interface ObservationsTableProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
  patients?: Patient[];
  rooms?: Room[];
}

function patientOptionLabel(patient: Patient, rooms: Room[]): string {
  for (const room of rooms) {
    for (const bed of room.beds) {
      if (bed.patient?.id === patient.id || bed.id === patient.bed_id) {
        return `${patient.full_name} — палата ${room.number}, койка ${bed.number}`;
      }
    }
  }
  return patient.full_name;
}

const ObservationsTable: React.FC<ObservationsTableProps> = ({
  patientId,
  onPatientSelect,
  patients: patientsProp,
  rooms: roomsProp,
}) => {
  const [patients, setPatients] = useState<Patient[]>(patientsProp ?? []);
  const [rooms, setRooms] = useState<Room[]>(roomsProp ?? []);
  const [localPatientId, setLocalPatientId] = useState<number | null>(patientId);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePatientId = localPatientId ?? patientId;
  const selectedPatient = patients.find((p) => p.id === activePatientId);

  const [formData, setFormData] = useState({
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    pulse: '',
    complaints: '',
    examination: '',
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Observation>>({});

  useEffect(() => {
    setLocalPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    if (patientsProp) setPatients(patientsProp);
  }, [patientsProp]);

  useEffect(() => {
    if (roomsProp) setRooms(roomsProp);
  }, [roomsProp]);

  useEffect(() => {
    if (patientsProp && roomsProp) return;
    Promise.all([apiService.getPatients(), apiService.getRooms()])
      .then(([p, r]) => {
        if (!patientsProp) setPatients(p);
        if (!roomsProp) setRooms(r);
      })
      .catch(() => {});
  }, [patientsProp, roomsProp]);

  useEffect(() => {
    if (activePatientId) {
      loadObservations(activePatientId);
    } else {
      setObservations([]);
    }
  }, [activePatientId]);

  const handlePatientChange = (id: number) => {
    setLocalPatientId(id);
    onPatientSelect(id);
    setEditingId(null);
    setEditData({});
  };

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatientId) return;

    try {
      const newObservation = await apiService.createObservation({
        patient_id: activePatientId,
        record_date: new Date().toISOString().split('T')[0],
        temperature: parseFloat(formData.temperature) || null,
        blood_pressure_systolic: parseInt(formData.blood_pressure_systolic, 10) || null,
        blood_pressure_diastolic: parseInt(formData.blood_pressure_diastolic, 10) || null,
        pulse: parseInt(formData.pulse, 10) || null,
        complaints: formData.complaints || null,
        examination: formData.examination || null,
      });

      setObservations((prev) => [newObservation, ...prev]);
      setFormData({
        temperature: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        pulse: '',
        complaints: '',
        examination: '',
      });
    } catch (err) {
      setError('Ошибка добавления наблюдения');
      console.error(err);
    }
  };

  const startEditing = (obs: Observation) => {
    setEditingId(obs.id);
    setEditData({
      temperature: obs.temperature,
      blood_pressure_systolic: obs.blood_pressure_systolic,
      blood_pressure_diastolic: obs.blood_pressure_diastolic,
      pulse: obs.pulse,
      complaints: obs.complaints,
      examination: obs.examination,
    });
  };

  const handleEditChange = (field: keyof Partial<Observation>, value: unknown) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveEdit = async () => {
    if (editingId === null) return;

    try {
      const updatedObs = await apiService.updateObservation(editingId, editData);

      setObservations((prev) => prev.map((obs) => (obs.id === editingId ? updatedObs : obs)));
      setEditingId(null);
      setEditData({});
    } catch (err) {
      setError('Ошибка обновления наблюдения');
      console.error(err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const deleteObservation = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это наблюдение?')) return;

    try {
      await apiService.deleteObservation(id);
      setObservations((prev) => prev.filter((obs) => obs.id !== id));
    } catch (err) {
      setError('Ошибка удаления наблюдения');
      console.error(err);
    }
  };

  return (
    <div className="observations-table">
      <div className="observations-header">
        <div>
          <h2>Наблюдения</h2>
          {selectedPatient && (
            <p className="observations-subtitle">{selectedPatient.full_name}</p>
          )}
        </div>
        <div className="observations-toolbar">
          <label className="observations-select-label" htmlFor="obs-patient-select">
            Пациент:
          </label>
          <select
            id="obs-patient-select"
            className="observations-patient-select"
            value={activePatientId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) handlePatientChange(id);
            }}
          >
            <option value="" disabled>
              — Выберите пациента —
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {patientOptionLabel(p, rooms)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!activePatientId ? (
        <div className="observations-empty-patient">
          <p>Выберите пациента, чтобы просматривать и добавлять наблюдения</p>
        </div>
      ) : (
        <>
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
              <button type="submit" className="submit-btn">
                Добавить
              </button>
            </form>
          </div>

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
                  {observations.map((obs) => (
                    <tr key={obs.id}>
                      {editingId === obs.id ? (
                        <>
                          <td>{new Date(obs.record_date).toLocaleDateString('ru-RU')}</td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={editData.temperature ?? ''}
                              onChange={(e) =>
                                handleEditChange(
                                  'temperature',
                                  e.target.value ? parseFloat(e.target.value) : null,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={editData.blood_pressure_systolic ?? ''}
                              onChange={(e) =>
                                handleEditChange(
                                  'blood_pressure_systolic',
                                  e.target.value ? parseInt(e.target.value, 10) : null,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={editData.blood_pressure_diastolic ?? ''}
                              onChange={(e) =>
                                handleEditChange(
                                  'blood_pressure_diastolic',
                                  e.target.value ? parseInt(e.target.value, 10) : null,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={editData.pulse ?? ''}
                              onChange={(e) =>
                                handleEditChange(
                                  'pulse',
                                  e.target.value ? parseInt(e.target.value, 10) : null,
                                )
                              }
                            />
                          </td>
                          <td>
                            <textarea
                              value={editData.complaints ?? ''}
                              onChange={(e) =>
                                handleEditChange('complaints', e.target.value || null)
                              }
                            />
                          </td>
                          <td>
                            <textarea
                              value={editData.examination ?? ''}
                              onChange={(e) =>
                                handleEditChange('examination', e.target.value || null)
                              }
                            />
                          </td>
                          <td>
                            <button type="button" onClick={saveEdit}>
                              Сохранить
                            </button>
                            <button type="button" onClick={cancelEdit}>
                              Отмена
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{new Date(obs.record_date).toLocaleDateString('ru-RU')}</td>
                          <td>{obs.temperature != null ? `${obs.temperature}°` : '—'}</td>
                          <td>{obs.blood_pressure_systolic ?? '—'}</td>
                          <td>{obs.blood_pressure_diastolic ?? '—'}</td>
                          <td>{obs.pulse ?? '—'}</td>
                          <td>{obs.complaints || '—'}</td>
                          <td>{obs.examination || '—'}</td>
                          <td>
                            <button type="button" onClick={() => startEditing(obs)}>
                              Ред.
                            </button>
                            <button type="button" onClick={() => deleteObservation(obs.id)}>
                              Удл.
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <p className="no-observations">Нет наблюдений</p>
          )}
        </>
      )}
    </div>
  );
};

export default ObservationsTable;
