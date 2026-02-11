import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Patient, Room } from '../../types';
import './ArchivedPatients.css';

const ArchivedPatients: React.FC = () => {
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArchivedPatients();
    loadRooms();
  }, []);

  const loadArchivedPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getArchivedPatients();
      setArchivedPatients(data);
    } catch (err) {
      setError('Ошибка загрузки архивных пациентов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const data = await apiService.getRooms();
      setRooms(data);
    } catch (err) {
      console.error('Ошибка загрузки палат:', err);
    }
  };

  // Найти палату по `patient.bed_id` и связь с койкой
  const getPatientRoomAndBed = (patient: Patient) => {
    for (const room of rooms) {
      const bed = room.beds.find(b => b.id === patient.bed_id);
      if (bed) {
        return { room, bed };
      }
    }
    return { room: undefined, bed: undefined };
  };

  const restorePatient = async (patientId: number) => {
    if (!window.confirm('Вы уверены, что хотите вернуть пациента из архива?')) return;

    try {
      await apiService.restorePatient(patientId);
      loadArchivedPatients();
    } catch (err) {
      setError('Ошибка восстановления пациента');
      console.error(err);
    }
  };

  return (
    <div className="archived-patients">
      <h2>Архив пациентов</h2>

      {loading && <p>Загрузка...</p>}
      {error && <div className="error-message">{error}</div>}

      {archivedPatients.length > 0 ? (
        <div className="patients-list">
          <table className="patients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ФИО</th>
                <th>Дата поступления</th>
                <th>Дата выписки</th>
                <th>Палата</th>
                <th>Койка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {archivedPatients.map(patient => {
                const { room, bed } = getPatientRoomAndBed(patient);
                return (
                  <tr key={patient.id}>
                    <td>{patient.id}</td>
                    <td>{patient.full_name}</td>
                    <td>{new Date(patient.admission_date).toLocaleDateString('ru-RU')}</td>
                    <td>{patient.discharge_date ? new Date(patient.discharge_date).toLocaleDateString('ru-RU') : '—'}</td>
                    <td>{room ? room.number : '—'}</td>
                    <td>{bed ? bed.number : '—'}</td>
                    <td>
                      <button onClick={() => restorePatient(patient.id)}>Вернуть</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-patients">Архив пуст</p>
      )}
    </div>
  );
};

export default ArchivedPatients;