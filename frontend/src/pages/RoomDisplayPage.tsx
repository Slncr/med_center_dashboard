import React, { useState, useEffect } from 'react';
import { Room, Bed, Patient } from '../types/patient';
import { apiService } from '../services/api';
import StartButton from '../components/patient-room/StartButton';
import BedCard from '../components/patient-room/BedCard';
import WelcomeMessage from '../components/patient-room/WelcomeMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './RoomDisplayPage.css';
import AppointmentsDisplay from '../components/patient-room/AppointmentsDisplay';


const RoomDisplayPage: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{
    id: number;
    name: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Проверка подключения к API
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      const health = await apiService.healthCheck();
      setApiConnected(health.status === 'healthy');
    } catch (err) {
      console.error('API connection error:', err);
      setApiConnected(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const roomsData = await apiService.getRooms();
      setRooms(roomsData);
      setApiConnected(true);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Ошибка загрузки данных. Проверьте подключение к серверу.');
      
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (bedId: number, patientName: string, patientId?: number) => {
    try {
      const response = await apiService.selectPatient(bedId);
      
      // response уже имеет тип PatientSelectResponse, а не ApiResponse
      setSelectedPatient({
        id: patientId || bedId, // Используем переданный patientId если есть
        name: patientName,
        message: response.welcome_message || 'Добро пожаловать в медицинский центр!'
      });
      
      // Прокрутка к сообщению
      setTimeout(() => {
        const welcomeElement = document.getElementById('welcome-message');
        if (welcomeElement) {
          welcomeElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error('Error selecting patient:', err);
      // Демо режим при ошибке
      setSelectedPatient({
        id: bedId,
        name: patientName,
        message: 'Добро пожаловать! (оффлайн режим)'
      });
    }
  };

  const handleCloseWelcome = () => {
    setSelectedPatient(null);
  };

  return (
    <div className="room-display-page">
      <header className="page-header">
        <div className="header-content">
          <h1 className="clinic-name">🏥 Медицинский Центр</h1>
          <h2 className="page-title">Планшет у палаты</h2>
          <div className={`api-status ${apiConnected ? 'connected' : 'disconnected'}`}>
            Статус: {apiConnected ? '✅ Подключено' : '❌ Нет подключения'}
          </div>
        </div>
        <div className="header-info">
          <div className="info-item">📅 {new Date().toLocaleDateString('ru-RU')}</div>
          <div className="info-item">🕒 {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="info-item">📍 Этаж 1</div>
        </div>
      </header>

      <main className="page-main">
        <div className="start-section">
          <div className="instruction-text">
            <h3>Начать регистрацию пациента</h3>
            <p>Нажмите кнопку ниже для загрузки списка доступных палат и пациентов</p>
          </div>
          
          <div className="button-container">
            <StartButton 
              onClick={handleStart} 
              loading={loading} 
              disabled={rooms.length > 0 && !error}
            />
          </div>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
              <p className="error-hint">Убедитесь, что бэкенд сервер запущен на http://localhost:8000</p>
            </div>
          )}
          
          {rooms.length > 0 && (
            <div className="stats-info">
              <div className="stat-item">
                <span className="stat-label">Загружено палат:</span>
                <span className="stat-value">{rooms.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Всего коек:</span>
                <span className="stat-value">
                  {rooms.reduce((total, room) => total + room.beds.length, 0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Статус:</span>
                <span className="stat-value ready">Готово</span>
              </div>
            </div>
          )}
        </div>

        {rooms.length > 0 && (
          <div className="rooms-section">
            <div className="section-header">
              <h3>📋 Доступные палаты</h3>
              <div className="section-subtitle">Выберите пациента для регистрации</div>
            </div>
            
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div key={room.id} className="room-container">
                  <div className="room-card">
                    <div className="room-header">
                      <div className="room-title">
                        <span className="room-icon">🚪</span>
                        <h4>Палата №{room.number}</h4>
                      </div>
                      <div className="room-stats">
                        <span className="bed-count">{room.beds.length} коек</span>
                      </div>
                    </div>
                    
                    <div className="beds-container">
                      {room.beds.map((bed) => {
                        // Получаем имя пациента - может быть string или Patient объект
                        const patientName = typeof bed.patient === 'string' 
                          ? bed.patient 
                          : bed.patient?.full_name || `Пациент ${bed.id}`;
                        
                        return (
                          <BedCard
                            key={bed.id}
                            bed={bed}
                            roomNumber={room.number}
                            onSelect={(bedId) => handlePatientSelect(bedId, patientName, bed.patient?.id)}
                            disabled={loading || !!selectedPatient}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPatient && (
          <div id="welcome-message" className="welcome-section">
            <WelcomeMessage
              patientName={selectedPatient.name}
              patientId={selectedPatient.id}
              message={selectedPatient.message}
              onClose={handleCloseWelcome}
            />
          </div>
        )}

        {selectedPatientId && (
          <div className="appointments-display-section">
            <h3>📋 Назначения и процедуры</h3>
            <AppointmentsDisplay 
              patientId={selectedPatientId}
              compact={true}
              onProcedureUpdate={() => {
                // Можно добавить обновление данных при изменении процедур
                console.log('Procedures updated');
              }}
            />
          </div>
        )}

        {!loading && rooms.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">👈</div>
            <h3>Готовы начать работу?</h3>
            <p>Нажмите кнопку "СТАРТ" для загрузки списка пациентов</p>
            <p className="empty-hint">После загрузки вы сможете выбрать пациента для регистрации</p>
          </div>
        )}

        {loading && rooms.length === 0 && (
          <div className="loading-state">
            <LoadingSpinner size="large" />
            <p>Загрузка данных с сервера...</p>
          </div>
        )}
      </main>

      <footer className="page-footer">
        <div className="footer-content">
          <p className="footer-text">© 2024 Медицинский Центр. Система управления пациентами</p>
          <div className="system-info">
            <span className="system-version">Версия 1.0.0</span>
            <span className="system-mode">Режим: {apiConnected ? 'Рабочий' : 'Демо'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RoomDisplayPage