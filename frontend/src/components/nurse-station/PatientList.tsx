import React from 'react';
import { Patient, Room } from '../../types';
import './PatientList.css';

interface PatientListProps {
  patients: Patient[];
  rooms: Room[];
  onPatientSelect: (patientId: number) => void;
}

const PatientList: React.FC<PatientListProps> = ({ patients, rooms, onPatientSelect }) => {
  const getPatientRoom = (patient: Patient): Room | undefined => {
    return rooms.find(room => 
      room.beds.some(bed => bed.patient?.id === patient.id)
    );
  };

  const getPatientBed = (patient: Patient): number | undefined => {
    for (const room of rooms) {
      const bed = room.beds.find(b => b.patient?.id === patient.id);
      if (bed) return bed.number;
    }
    return undefined;
  };

  const activePatients = patients.filter(p => p.status === 'active');

  return (
    <div className="patient-list">
      <div className="list-header">
        <h2>Активные пациенты ({activePatients.length})</h2>
        <div className="list-actions">
          <button className="action-button refresh-button">🔄 Обновить</button>
          <button className="action-button filter-button">🔍 Фильтр</button>
        </div>
      </div>

      <div className="patients-grid">
        {activePatients.map(patient => {
          const room = getPatientRoom(patient);
          const bedNumber = getPatientBed(patient);

          return (
            <div key={patient.id} className="patient-card">
              <div className="patient-header">
                <h3>{patient.full_name}</h3>
                <span className="patient-status active">Активный</span>
              </div>
              
              <div className="patient-info">
                <div className="info-row">
                  <span className="info-label">Палата:</span>
                  <span className="info-value">{room ? room.number : '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Койка:</span>
                  <span className="info-value">{bedNumber || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Поступил:</span>
                  <span className="info-value">
                    {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">ID:</span>
                  <span className="info-value">{patient.external_id || patient.id}</span>
                </div>
              </div>

              <div className="patient-actions">
                <button 
                  className="action-button select-button"
                  onClick={() => onPatientSelect(patient.id)}
                >
                  Выбрать
                </button>
                <button className="action-button view-button">
                  Карта
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activePatients.length === 0 && (
        <div className="empty-list">
          <p>Нет активных пациентов</p>
        </div>
      )}
    </div>
  );
};

export default PatientList;