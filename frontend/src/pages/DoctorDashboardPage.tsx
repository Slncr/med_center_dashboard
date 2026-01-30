import React, { useState } from 'react';
import { usePatients } from '../hooks/usePatients';
// import { useWebSocket } from '../hooks/useWebSocket';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './DoctorDashboardPage.css';

const DoctorDashboardPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'patients' | 'prescriptions' | 'reports'>('overview');
  const { patients, loading, error } = usePatients();
  
  // Используйте 3 параметра: clientId, onMessage, options
  // const { isConnected } = useWebSocket('doctor', undefined, {
  //   autoConnect: true,
  //   reconnectInterval: 3000
  // });

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
        <p>Загрузка данных врача...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Ошибка загрузки данных</h2>
        <p>{error}</p>
      </div>
    );
  }

  const activePatients = patients;
  const today = new Date().toLocaleDateString('ru-RU');

  return (  
    <div className="doctor-dashboard">
      <header className="doctor-header">
        <div className="header-content">
          <h1>👨‍⚕️ Кабинет врача</h1>
          <div className="header-info">
            <div className="info-item">
              <span className="info-label">Дата:</span>
              <span className="info-value">{today}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Пациентов:</span>
              <span className="info-value">{activePatients.length}</span>
            </div>
            {/* <div className={`info-item ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="info-label">Связь:</span>
              <span className="info-value">{isConnected ? '✓' : '✗'}</span>
            </div> */}
          </div>
        </div>
      </header>

      <nav className="doctor-nav">
        <button 
          className={`nav-button ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 Обзор
        </button>
        <button 
          className={`nav-button ${activeView === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveView('patients')}
        >
          👥 Пациенты
        </button>
        <button 
          className={`nav-button ${activeView === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveView('prescriptions')}
        >
          💊 Назначения
        </button>
        <button 
          className={`nav-button ${activeView === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveView('reports')}
        >
          📄 Отчеты
        </button>
      </nav>

      <main className="doctor-main">
        {activeView === 'overview' && (
          <div className="overview-grid">
            <div className="stat-card">
              <h3>Активные пациенты</h3>
              <div className="stat-value">{activePatients.length}</div>
              <div className="stat-change">+2 за сегодня</div>
            </div>
            <div className="stat-card">
              <h3>Ожидают осмотра</h3>
              <div className="stat-value">3</div>
              <div className="stat-change">Срочных: 1</div>
            </div>
            <div className="stat-card">
              <h3>Назначения сегодня</h3>
              <div className="stat-value">12</div>
              <div className="stat-change">Выполнено: 8</div>
            </div>
            <div className="stat-card">
              <h3>Готовы к выписке</h3>
              <div className="stat-value">2</div>
              <div className="stat-change">Ожидают подтверждения</div>
            </div>
          </div>
        )}

        {activeView === 'patients' && (
          <div className="patients-list">
            <h2>Список пациентов</h2>
            <div className="patients-grid">
              {activePatients.map(patient => (
                <div key={patient.id} className="patient-card">
                  <h3>{patient.full_name}</h3>
                  <div className="patient-info">
                    <div>Поступил: {new Date(patient.admission_date).toLocaleDateString('ru-RU')}</div>
                    <div>Статус: <span className="status-active">Активный</span></div>
                  </div>
                  <button className="view-button">Просмотр карты</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'prescriptions' && (
          <div className="prescriptions-view">
            <h2>Создание назначений</h2>
            <p>Интерфейс для создания назначений будет здесь</p>
          </div>
        )}

        {activeView === 'reports' && (
          <div className="reports-view">
            <h2>Медицинские отчеты</h2>
            <p>Интерфейс для генерации отчетов будет здесь</p>
          </div>
        )}
      </main>

      <footer className="doctor-footer">
        <p>Медицинский центр • Кабинет врача • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default DoctorDashboardPage;