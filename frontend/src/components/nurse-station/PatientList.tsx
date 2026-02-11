import React, { useState } from 'react';
import { Patient, Room } from '../../types';
import './PatientList.css';
import PatientCard from './PatientCard';

interface PatientListProps {
  patients: Patient[];
  rooms: Room[];
  onPatientSelect: (patientId: number) => void;
  onPatientsUpdate?: () => void;
}

const PatientList: React.FC<PatientListProps> = ({ patients, rooms, onPatientSelect, onPatientsUpdate }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const handlePatientArchived = () => {
    if (onPatientsUpdate) {
      onPatientsUpdate();
    }
  }

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

  const activePatients = patients;

  const closePatientCard = () => { 
    setSelectedPatientId(null)
  };

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
          const { room, bed } = getPatientRoomAndBed(patient);

          return (
            <div key={patient.id} className="patient-card">
              <div className="patient-header">
                <h3>{patient.full_name}</h3>
                <span className={`patient-status ${patient.status}`}>{patient.status}</span>
              </div>

              <div className="patient-info">
                <div className="info-row">
                  <span className="info-label">Палата:</span>
                  <span className="info-value">{room ? room.number : '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Койка:</span>
                  <span className="info-value">{bed ? bed.number : '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Поступил:</span>
                  <span className="info-value">
                    {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {/* <div className="info-row">
                  <span className="info-label">IqqqD:</span>
                  <span className="info-value">{patient.external_id || patient.id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Подразделение:</span>
                  <span className="info-value">{patient.department_name || '—'}</span>
                </div> */}
              </div>

              <div className="patient-actions">
                <button
                  className="action-button select-button"
                  onClick={() => onPatientSelect(patient.id)}
                >
                  Выбрать
                </button>
                <button 
                  className="action-button view-button"
                  onClick={() => setSelectedPatientId(patient.id)}  
                >Карта</button>
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

      {selectedPatientId && (
        <div className="modal-overlay" onClick={closePatientCard}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <PatientCard
              patientId={selectedPatientId}
              onClose={closePatientCard}
              onPatientArchived={handlePatientArchived}  />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;