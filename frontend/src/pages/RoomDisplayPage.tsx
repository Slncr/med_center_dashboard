import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Patient, Room, Prescription } from '../types';
import './RoomDisplayPage.css';

const RoomDisplayPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

  // Обновление времени каждую секунду
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Автоматическая загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await apiService.healthCheck();
      setApiConnected(true);

      const [roomsData, patientsData] = await Promise.all([
        apiService.getRooms(),
        apiService.getPatients()
      ]);

      setRooms(roomsData);
      setPatients(patientsData);

      // Автоматически выбираем первую палату с пациентами
      const roomWithPatients = roomsData.find(r => 
        r.beds.some(b => b.patient)
      );
      if (roomWithPatients) {
        setActiveRoomId(roomWithPatients.id);
        const firstBed = roomWithPatients.beds.find(b => b.patient);
        if (firstBed) {
          const patient = patientsData.find(p => p.id === firstBed.patient?.id);
          if (patient) {
            handlePatientSelect(patient.id);
          }
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handlePatientSelect = async (patientId: number) => {
    setSelectedPatientId(patientId);
    
    try {
      const data = await apiService.getPrescriptions(patientId);
      setPrescriptions(data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
      setPrescriptions([]);
    }
  };

  const getPatientByBedId = (bedId: number): Patient | undefined => {
    const bed = rooms.flatMap(r => r.beds).find(b => b.id === bedId);
    return bed?.patient?.id ? patients.find(p => p.id === bed.patient?.id) : undefined;
  };

  const getRoomById = (roomId: number): Room | undefined => {
    return rooms.find(r => r.id === roomId);
  };

  if (loading) {
    return (
      <div className="room-display-page loading">
        <div className="loading-content">
          <div className="clinic-logo">🏥</div>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const activeRoom = activeRoomId ? getRoomById(activeRoomId) : null;
  const selectedPatient = selectedPatientId ? patients.find(p => p.id === selectedPatientId) : null;

  return (
    <div className="room-display-page">
      {/* Хедер */}
      <header className="room-header">
        <div className="header-left">
          <div className="clinic-logo">🏥</div>
          <div className="clinic-name">Медицинский центр</div>
          {activeRoom && (
            <div className="room-location">Палата №{activeRoom.number}</div>
          )}
        </div>
        
        <div className="header-center">
          <div className="current-time">
            <span className="time">{currentTime.toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit'
            })}</span>
            <span className="date">{currentTime.toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className={`connection-indicator ${apiConnected ? 'connected' : 'disconnected'}`}></div>
        </div>
      </header>

      <main className="room-main">
        {/* Список пациентов */}
        <div className="patients-panel">
          <div className="panel-header">
            <h2>Пациенты</h2>
            {activeRoom && (
              <div className="room-stats">
                {activeRoom.beds.filter(b => b.patient?.id).length} из {activeRoom.beds.length}
              </div>
            )}
          </div>
          
          <div className="patients-list">
            {activeRoom ? (
              activeRoom.beds.map(bed => {
                const patient = getPatientByBedId(bed.id);
                return (
                  <div 
                    key={bed.id} 
                    className={`patient-row ${selectedPatientId === patient?.id ? 'active' : ''}`}
                    onClick={() => patient && handlePatientSelect(patient.id)}
                  >
                    <div className="bed-col">Койка {bed.number}</div>
                    <div className="name-col">
                      {patient ? (
                        <>
                          <div className="patient-name">{patient.full_name}</div>
                          <div className="patient-meta">
                            Поступил: {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                          </div>
                        </>
                      ) : (
                        <div className="empty-bed">Свободна</div>
                      )}
                    </div>
                    <div className={`status-col ${patient ? 'occupied' : 'empty'}`}>
                      {patient ? '●' : '○'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">Нет активных палат</div>
            )}
          </div>
        </div>

        {/* Основной контент */}
        <div className="content-panel">
          {/* Карточка пациента */}
          <div className="patient-card">
            {selectedPatient ? (
              <>
                <div className="patient-header">
                  <h1>{selectedPatient.full_name}</h1>
                  <div className="patient-id">ID: {selectedPatient.id}</div>
                </div>
                
                <div className="patient-info-grid">
                  <div className="info-item">
                    <div className="info-label">Статус</div>
                    <div className={`info-value status-${selectedPatient.status}`}>
                      {selectedPatient.status === 'active' ? 'Активный' : 'Выписан'}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Поступление</div>
                    <div className="info-value">
                      {new Date(selectedPatient.admission_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Койка</div>
                    <div className="info-value">
                      {selectedPatient.bed_id || '—'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-patient-selected">
                <div className="placeholder-icon">👤</div>
                <p>Выберите пациента из списка слева</p>
              </div>
            )}
          </div>

          {/* Назначения */}
          <div className="prescriptions-panel">
            <div className="panel-header">
              <h2>Назначения</h2>
              <div className="prescriptions-count">{prescriptions.length}</div>
            </div>
            
            {prescriptions.length > 0 ? (
              <div className="prescriptions-list">
                {prescriptions.map(p => (
                  <div key={p.id} className={`prescription-row status-${p.status.toLowerCase()}`}>
                    <div className="type-col">
                      {p.prescription_type === 'PROCEDURE' && '💉'}
                      {p.prescription_type === 'MEASUREMENT' && '📊'}
                      {p.prescription_type === 'NOTE' && '📝'}
                    </div>
                    <div className="name-col">
                      <div className="prescription-name">{p.name}</div>
                      {p.notes && (
                        <div className="prescription-notes">{p.notes}</div>
                      )}
                    </div>
                    <div className="freq-col">{p.frequency || '—'}</div>
                    <div className="status-col">
                      {p.status === 'ACTIVE' && <span className="status-dot active"></span>}
                      {p.status === 'COMPLETED' && <span className="status-dot completed">✓</span>}
                      {p.status === 'CANCELLED' && <span className="status-dot cancelled">×</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-prescriptions">
                <div className="placeholder-icon">📋</div>
                <p>Нет активных назначений</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="room-footer">
        <div className="footer-left">Медицинский центр • Планшет у палаты</div>
        <div className="footer-right">v1.2</div>
      </footer>
    </div>
  );
};

export default RoomDisplayPage;