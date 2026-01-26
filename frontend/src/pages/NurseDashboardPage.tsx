import React, { useState, useEffect } from 'react';
// import { useWebSocket } from '../hooks/useWebSocket';
import { usePatients } from '../hooks/usePatients';
import PatientList from '../components/nurse-station/PatientList';
import ObservationsTable from '../components/nurse-station/ObservationsTable';
import MedicalForm530n from '../components/nurse-station/MedicalForm530n';
import AppointmentsView from '../components/nurse-station/AppointmentsView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { WebSocketMessage, PatientSelectedEvent } from '../types';
import './NurseDashboardPage.css';

const NurseDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patients' | 'observations' | 'form530n' | 'appointments'>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  const { patients, rooms, loading, error, refetch } = usePatients();
  // const { isConnected, messages, sendMessage } = useWebSocket('nurse', handleWebSocketMessage);

  function handleWebSocketMessage(message: WebSocketMessage) {
    console.log('Nurse received:', message);
    
    switch (message.event) {
      case 'patient_selected':
        const patientEvent = message.data as PatientSelectedEvent;
        setNotifications(prev => [
          ...prev,
          `Пациент ${patientEvent.patient_name} выбран в палате ${patientEvent.room_number}`
        ]);
        refetch();
        break;
      
      case 'notification':
        setNotifications(prev => [...prev, message.data.message]);
        break;
    }
  }

  const handlePatientSelect = (patientId: number) => {
    setSelectedPatientId(patientId);
    setActiveTab('observations');
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Ошибка загрузки данных</h2>
        <p>{error}</p>
        <button onClick={() => refetch()} className="retry-button">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="nurse-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🩺 Станция медсестры</h1>
          {/* <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            WebSocket: {isConnected ? '✅ Подключен' : '❌ Отключен'}
          </div> */}
        </div>
        <div className="header-right">
          <div className="time-display">
            {new Date().toLocaleDateString('ru-RU')} {new Date().toLocaleTimeString('ru-RU')}
          </div>
          <div className="patient-count">
            Пациентов: {patients.length}
          </div>
        </div>
      </header>

      {notifications.length > 0 && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h3>🔔 Уведомления ({notifications.length})</h3>
            <button onClick={handleClearNotifications} className="clear-button">
              Очистить
            </button>
          </div>
          <div className="notifications-list">
            {notifications.slice(-5).map((notification, index) => (
              <div key={index} className="notification-item">
                {notification}
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          👥 Пациенты
        </button>
        <button 
          className={`tab-button ${activeTab === 'observations' ? 'active' : ''}`}
          onClick={() => setActiveTab('observations')}
        >
          📊 Наблюдения
        </button>
        <button 
          className={`tab-button ${activeTab === 'form530n' ? 'active' : ''}`}
          onClick={() => setActiveTab('form530n')}
        >
          📋 Форма 530н
        </button>
        <button 
          className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          ⏰ Назначения
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'patients' && (
          <div className="tab-content">
            <PatientList 
              patients={patients} 
              rooms={rooms}
              onPatientSelect={handlePatientSelect}
            />
          </div>
        )}

        {activeTab === 'observations' && (
          <div className="tab-content">
            <ObservationsTable 
              patientId={selectedPatientId}
              onPatientSelect={setSelectedPatientId}
            />
          </div>
        )}

        {activeTab === 'form530n' && (
          <div className="tab-content">
            <MedicalForm530n 
              patientId={selectedPatientId}
              onPatientSelect={setSelectedPatientId}
            />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="tab-content">
            <AppointmentsView 
              patientId={selectedPatientId}
              onPatientSelect={setSelectedPatientId}
            />
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>Медицинский центр • Станция медсестры • {new Date().getFullYear()}</p>
        <p className="system-info">
          Пациентов: {patients.length} | Палат: {rooms.length}
          {/* | WS: {isConnected ? '✓' : '✗'} */}
        </p>
      </footer>
    </div>
  );
};

export default NurseDashboardPage;