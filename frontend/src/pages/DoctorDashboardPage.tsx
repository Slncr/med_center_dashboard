import React, { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { apiService } from '../services/api';
import { Patient, Prescription } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PatientCard from '../components/nurse-station/PatientCard';
import PrescriptionsForm from '../components/doctor-station/PrescriptionsForm';
import PrescriptionsList from '../components/doctor-station/PrescriptionsList';
import './DoctorDashboardPage.css';

interface DoctorDashboardPageProps {
  onPatientsUpdate?: () => void;
}

const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({ onPatientsUpdate }) => {
  const [activeView, setActiveView] = useState<'overview' | 'patients' | 'prescriptions' | 'reports'>('overview');
  const { patients, loading: patientsLoading, refetch: refetchPatients, error: patientsError } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  
  // Статистика для вкладки "Обзор"
  const [stats, setStats] = useState({
    activePatients: 0,
    awaitingExamination: 0,
    prescriptionsToday: 0,
    readyForDischarge: 0,
    completedPrescriptions: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (patients.length === 0) return;

    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      
      try {
        // Получаем назначения для всех активных пациентов параллельно
        const prescriptionsPromises = patients.map(p => 
          apiService.getPrescriptions(p.id)
        );
        
        const allPrescriptionsResults = await Promise.allSettled(prescriptionsPromises);
        
        // Обрабатываем результаты
        let totalPrescriptionsToday = 0;
        let totalCompleted = 0;
        let readyForDischargeCount = 0;
        
        // Фильтруем успешные результаты и объединяем назначения
        const allPrescriptions: Prescription[] = [];
        allPrescriptionsResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allPrescriptions.push(...result.value);
          }
        });

        // Считаем назначения за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const prescriptionsToday = allPrescriptions.filter(p => {
          const createdAt = new Date(p.created_at);
          createdAt.setHours(0, 0, 0, 0);
          return createdAt.getTime() === today.getTime();
        });
        
        totalPrescriptionsToday = prescriptionsToday.length;
        totalCompleted = allPrescriptions.filter(p => p.status === 'COMPLETED').length;
        
        // Считаем пациентов, готовых к выписке (все назначения выполнены)
        const patientsWithPrescriptions = new Map<number, Prescription[]>();
        allPrescriptions.forEach(p => {
          if (!patientsWithPrescriptions.has(p.patient_id)) {
            patientsWithPrescriptions.set(p.patient_id, []);
          }
          patientsWithPrescriptions.get(p.patient_id)!.push(p);
        });
        
        patientsWithPrescriptions.forEach((patientPrescriptions, patientId) => {
          const hasActive = patientPrescriptions.some(p => p.status === 'ACTIVE');
          if (!hasActive && patientPrescriptions.length > 0) {
            readyForDischargeCount++;
          }
        });

        // Считаем пациентов, ожидающих осмотра (нет наблюдений за последние 24 часа)
        // Для упрощения считаем всех пациентов без назначений как ожидающих осмотра
        const patientsNeedingExamination = patients.filter(p => {
          const hasPrescriptions = allPrescriptions.some(pr => pr.patient_id === p.id);
          return !hasPrescriptions;
        }).length;

        setStats({
          activePatients: patients.length,
          awaitingExamination: patientsNeedingExamination,
          prescriptionsToday: totalPrescriptionsToday,
          readyForDischarge: readyForDischargeCount,
          completedPrescriptions: totalCompleted
        });
      } catch (err) {
        console.error('Error loading statistics:', err);
        setStatsError('Ошибка загрузки статистики');
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [patients]);

  const closePatientCard = () => { 
    setSelectedPatientId(null);
  };

  const handlePatientArchived = () => {
    if (onPatientsUpdate) {
      onPatientsUpdate();
    }
    refetchPatients();
  };

  if (patientsLoading && patients.length === 0) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
        <p>Загрузка данных врача...</p>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="error-container">
        <h2>Ошибка загрузки данных</h2>
        <p>{patientsError}</p>
        <button onClick={refetchPatients} className="retry-btn">Повторить</button>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

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
              <span className="info-value">{stats.activePatients}</span>
            </div>
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
          👥 Пациенты ({stats.activePatients})
        </button>
        <button 
          className={`nav-button ${activeView === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveView('prescriptions')}
        >
          💊 Назначения ({stats.prescriptionsToday})
        </button>
        <button 
          className={`nav-button ${activeView === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveView('reports')}
        >
          📄 Отчёты
        </button>
      </nav>

      <main className="doctor-main">
        {activeView === 'overview' && (
          <div className="overview-container">
            {statsError && (
              <div className="stats-error">
                <div className="error-icon">⚠️</div>
                <div>{statsError}</div>
                <button onClick={() => refetchPatients()} className="retry-btn small">Обновить</button>
              </div>
            )}
            
            {statsLoading ? (
              <div className="stats-loading">
                <LoadingSpinner size="medium" />
                <p>Загрузка статистики...</p>
              </div>
            ) : (
              <div className="overview-grid">
                <div className="stat-card primary">
                  <h3>Активные пациенты</h3>
                  <div className="stat-value">{stats.activePatients}</div>
                  <div className="stat-desc">Всего на лечении</div>
                </div>
                <div className="stat-card warning">
                  <h3>Ожидают осмотра</h3>
                  <div className="stat-value">{stats.awaitingExamination}</div>
                  <div className="stat-desc">Нет назначений</div>
                </div>
                <div className="stat-card info">
                  <h3>Назначений сегодня</h3>
                  <div className="stat-value">{stats.prescriptionsToday}</div>
                  <div className="stat-desc">Создано за 24 часа</div>
                </div>
                <div className="stat-card success">
                  <h3>Готовы к выписке</h3>
                  <div className="stat-value">{stats.readyForDischarge}</div>
                  <div className="stat-desc">Все назначения выполнены</div>
                </div>
                <div className="stat-card neutral">
                  <h3>Выполнено назначений</h3>
                  <div className="stat-value">{stats.completedPrescriptions}</div>
                  <div className="stat-desc">За всё время</div>
                </div>
                <div className="stat-card patients-list-card">
                  <h3>Последние пациенты</h3>
                  <div className="patients-mini-list">
                    {patients.slice(0, 5).map(patient => (
                      <div 
                        key={patient.id} 
                        className="patient-mini-item"
                        onClick={() => setSelectedPatientId(patient.id)}
                      >
                        <div className="patient-name">{patient.full_name}</div>
                        <div className="patient-meta">
                          Койка #{patient.bed_id || '?'} • 
                          {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    ))}
                    {patients.length === 0 && (
                      <div className="empty-state">Нет активных пациентов</div>
                    )}
                  </div>
                  <button 
                    className="view-all-btn" 
                    onClick={() => setActiveView('patients')}
                  >
                    Показать всех пациентов →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'patients' && (
          <div className="patients-view">
            <div className="view-header">
              <h2>Список пациентов</h2>
              <div className="view-controls">
                <button onClick={refetchPatients} className="refresh-btn">
                  🔄 Обновить
                </button>
              </div>
            </div>
            
            {patients.length === 0 ? (
              <div className="empty-state">
                <div>🏥</div>
                <p>Нет активных пациентов</p>
                <p className="empty-hint">Пациенты появятся после поступления в стационар</p>
              </div>
            ) : (
              <div className="patients-grid">
                {patients.map(patient => (
                  <div 
                    key={patient.id} 
                    className={`patient-card ${selectedPatientId === patient.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <div className="patient-header">
                      <div className="patient-name">{patient.full_name}</div>
                      <div className={`patient-status status-${patient.status}`}>
                        {patient.status === 'active' ? 'Активный' : 'Выписан'}
                      </div>
                    </div>
                    
                    <div className="patient-details">
                      <div className="detail-row">
                        <span className="detail-label">Койка:</span>
                        <span className="detail-value">#{patient.bed_id || '—'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Поступил:</span>
                        <span className="detail-value">
                          {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Подразделение:</span>
                        <span className="detail-value">{patient.department_name || '—'}</span>
                      </div>
                    </div>
                    
                    <button className="open-card-btn">
                      Открыть карту пациента →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'prescriptions' && (
          <div className="prescriptions-view">
            <div className="view-header">
              <h2>Назначения пациентов</h2>
              <div className="view-controls">
                <button onClick={refetchPatients} className="refresh-btn">
                  🔄 Обновить
                </button>
              </div>
            </div>
            
            <div className="prescriptions-container">
              <div className="prescriptions-form-section">
                <PrescriptionsForm onPrescriptionCreated={refetchPatients} />
              </div>
              
              {selectedPatientId && (
                <div className="prescriptions-list-section">
                  <PrescriptionsList 
                    patientId={selectedPatientId} 
                    onPrescriptionCompleted={refetchPatients} 
                  />
                </div>
              )}
              
              {/* {!selectedPatientId && (
                <div className="select-patient-hint">
                  <p>👈 Выберите пациента из списка, чтобы увидеть его назначения</p>
                  <div className="hint-icon">🩺</div>
                </div>
              )} */}
            </div>
          </div>
        )}

        {activeView === 'reports' && (
          <div className="reports-view">
            <div className="view-header">
              <h2>Медицинские отчёты</h2>
            </div>
            
            <div className="reports-grid">
              <div className="report-card">
                <h3>📊 Статистика по пациентам</h3>
                <p>Ежедневная и еженедельная статистика по поступившим, выписанным и находящимся на лечении пациентам</p>
                <button className="report-btn">Сформировать отчёт</button>
              </div>
              
              <div className="report-card">
                <h3>💊 Статистика по назначениям</h3>
                <p>Анализ выполнения назначений по отделениям, врачам и типам процедур</p>
                <button className="report-btn">Сформировать отчёт</button>
              </div>
              
              <div className="report-card">
                <h3>📋 Форма 530н</h3>
                <p>Генерация и экспорт формы 530н для выбранного пациента</p>
                <button className="report-btn">Создать форму</button>
              </div>
              
              <div className="report-card">
                <h3>🏥 Отчёт по отделению</h3>
                <p>Сводный отчёт по загруженности коечного фонда и эффективности лечения</p>
                <button className="report-btn">Сформировать отчёт</button>
              </div>
            </div>
            
            <div className="reports-footer">
              <p>Все отчёты формируются на основе актуальных данных из системы</p>
              <p className="report-note">Для экспорта в Excel или PDF используйте кнопку "Экспорт" в интерфейсе отчёта</p>
            </div>
          </div>
        )}
      </main>

      {selectedPatientId && (
        <div className="modal-overlay" onClick={closePatientCard}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <PatientCard 
              patientId={selectedPatientId} 
              onClose={closePatientCard}
              onPatientArchived={handlePatientArchived} 
            />
          </div>
        </div>
      )}

      <footer className="doctor-footer">
        <p>Медицинский центр • Кабинет врача • {new Date().getFullYear()}</p>
        <p className="footer-version">Версия 1.2</p>
      </footer>
    </div>
  );
};

export default DoctorDashboardPage;