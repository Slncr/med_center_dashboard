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
  const [error, setError] = useState<string | null>(null);

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
      // Проверка подключения к API
      // await apiService.healthCheck();
      setApiConnected(true);

      // Загрузка данных параллельно
      const [roomsData, patientsData] = await Promise.all([
        apiService.getRooms(),
        apiService.getPatients()
      ]);

      setRooms(roomsData);
      setPatients(patientsData);

      // ✅ Автоматически выбираем первую палату (не только с пациентами)
      if (roomsData.length > 0) {
        setActiveRoomId(roomsData[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setApiConnected(false);
      setError('Ошибка подключения к серверу. Проверьте сеть и перезагрузите страницу.');
    } finally {
      setLoading(false);
    }
  };

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
      setError('Ошибка загрузки назначений');
    }
  };

  // ✅ Поиск пациента по bed_id (корректная связь)
  const getPatientForBed = (bedId: number): Patient | undefined => {
    return patients.find(p => p.bed_id === bedId);
  };

  const getRoomById = (roomId: number): Room | undefined => {
    return rooms.find(r => r.id === roomId);
  };

  const handleRoomSelect = (roomId: number) => {
    setActiveRoomId(roomId);
    setSelectedPatientId(null);
    setPrescriptions([]);
  };

  if (loading) {
    return (
      <div className="room-display-page loading">
        <div className="loading-content">
          <div className="clinic-logo">🏥</div>
          <div className="spinner"></div>
          <p>Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-display-page error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button onClick={loadData} className="retry-btn">
            Повторить попытку
          </button>
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
          
          {/* ✅ Выбор палаты */}
          <div className="room-selector">
            <label htmlFor="room-select" className="room-select-label">Палата:</label>
            <select
              id="room-select"
              value={activeRoomId || ''}
              onChange={(e) => handleRoomSelect(Number(e.target.value))}
              className="room-select"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  №{room.number} {room.name ? `(${room.name})` : ''}
                </option>
              ))}
            </select>
          </div>
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
                {activeRoom.beds.filter(bed => 
                  patients.some(p => p.bed_id === bed.id)
                ).length} из {activeRoom.beds.length}
              </div>
            )}
          </div>
          
          <div className="patients-list">
            {activeRoom ? (
              activeRoom.beds.map(bed => {
                const patient = getPatientForBed(bed.id);
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
            ) : rooms.length === 0 ? (
              <div className="empty-state">Нет данных о палатах</div>
            ) : (
              <div className="empty-state">Выберите палату из списка выше</div>
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
            ) : selectedPatientId ? (
              <div className="empty-prescriptions">
                <div className="placeholder-icon">📋</div>
                <p>Нет назначений</p>
                <p className="hint">Обратитесь к лечащему врачу</p>
              </div>
            ) : (
              <div className="empty-prescriptions">
                <div className="placeholder-icon">👈</div>
                <p>Выберите пациента для просмотра назначений</p>
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