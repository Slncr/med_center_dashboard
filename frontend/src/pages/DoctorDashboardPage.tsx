import React, { useState, useEffect, useCallback } from 'react';
import { usePatients } from '../hooks/usePatients';
import { apiService } from '../services/api';
import { Room } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PatientCard from '../components/nurse-station/PatientCard';
import PatientList from '../components/nurse-station/PatientList';
import PrescriptionsForm from '../components/doctor-station/PrescriptionsForm';
import DoctorReportsView from '../components/doctor-station/DoctorReportsView';
import ArchivedPatientsPanel from '../components/shared/ArchivedPatientsPanel';
import { useUrlNumberParam, useUrlTab } from '../hooks/useUrlSearchState';
import { DOCTOR_TABS, DoctorTab, PATIENT_CARD_TABS, PatientCardTab, URL_PARAMS } from '../utils/urlTabs';
import '../components/nurse-station/PatientList.css';
import './DoctorDashboardPage.css';

interface DoctorDashboardPageProps {
  onPatientsUpdate?: () => void;
}

const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({ onPatientsUpdate }) => {
  const [activeView, setActiveView] = useUrlTab(URL_PARAMS.tab, DOCTOR_TABS, 'patients');
  const { patients, loading: patientsLoading, refetch: refetchPatients, error: patientsError } = usePatients();
  const [modalPatientId, setModalPatientId] = useUrlNumberParam(URL_PARAMS.card);
  const [prescriptionPatientId, setPrescriptionPatientId] = useUrlNumberParam(URL_PARAMS.patient);
  const [cardTab, setCardTab] = useUrlTab(URL_PARAMS.cardTab, PATIENT_CARD_TABS, 'observations');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activePrescriptionsCount, setActivePrescriptionsCount] = useState(0);

  const switchView = useCallback(
    (view: DoctorTab) => {
      if (view === 'patients' || view === 'archive') {
        setActiveView(view);
        return;
      }
      setActiveView(view, {
        [URL_PARAMS.card]: null,
        [URL_PARAMS.cardTab]: null,
      });
    },
    [setActiveView],
  );
  
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const roomsData = await apiService.getRooms();
        setRooms(roomsData);
      } catch (err) {
        console.error('Error loading rooms:', err);
      }
    };
    loadRooms();
  }, []);

  useEffect(() => {
    if (patients.length === 0) {
      setActivePrescriptionsCount(0);
      return;
    }

    let cancelled = false;

    const loadActivePrescriptionsCount = async () => {
      const results = await Promise.allSettled(
        patients.map((patient) => apiService.getPrescriptions(patient.id)),
      );

      if (cancelled) return;

      const count = results.reduce((total, result) => {
        if (result.status !== 'fulfilled') return total;
        return total + result.value.filter((item) => item.status === 'ACTIVE').length;
      }, 0);

      setActivePrescriptionsCount(count);
    };

    void loadActivePrescriptionsCount();

    return () => {
      cancelled = true;
    };
  }, [patients]);

  const closePatientCard = () => {
    setModalPatientId(null, { [URL_PARAMS.cardTab]: null });
  };

  const handlePatientArchived = () => {
    setModalPatientId(null, {
      [URL_PARAMS.cardTab]: null,
      [URL_PARAMS.patient]: null,
    });
    if (onPatientsUpdate) {
      onPatientsUpdate();
    }
    refetchPatients();
  };

  const openPatientPrescriptions = (patientId: number) => {
    setActiveView('prescriptions', {
      [URL_PARAMS.patient]: patientId,
      [URL_PARAMS.card]: null,
      [URL_PARAMS.cardTab]: null,
    });
  };

  const openPatientCardModal = (patientId: number, tab: PatientCardTab = 'observations') => {
    setActiveView('patients', {
      [URL_PARAMS.card]: patientId,
      [URL_PARAMS.cardTab]: tab === 'observations' ? null : tab,
    });
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
          <h1>Кабинет врача</h1>
          <div className="header-info">
            <div className="info-item">
              <span className="info-value">{today}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="doctor-nav">
        <button 
          className={`nav-button ${activeView === 'patients' ? 'active' : ''}`}
          onClick={() => switchView('patients')}
        >
          Пациенты
        </button>
        <button 
          className={`nav-button ${activeView === 'prescriptions' ? 'active' : ''}`}
          onClick={() => switchView('prescriptions')}
        >
          Назначения
        </button>
        <button 
          className={`nav-button ${activeView === 'reports' ? 'active' : ''}`}
          onClick={() => switchView('reports')}
        >
          Отчёты
        </button>
        <button
          className={`nav-button ${activeView === 'archive' ? 'active' : ''}`}
          onClick={() => switchView('archive')}
        >
          Архив
        </button>
      </nav>

      <main className={`doctor-main ${activeView === 'patients' ? 'doctor-main--patients' : ''}`}>
        {activeView === 'patients' && (
          <PatientList
            patients={patients}
            rooms={rooms}
            onPatientSelect={openPatientPrescriptions}
            onPatientsUpdate={handlePatientArchived}
            cardPatientId={modalPatientId}
            onOpenCard={openPatientCardModal}
            onCloseCard={closePatientCard}
          />
        )}

        {activeView === 'prescriptions' && (
          <div className="doctor-prescriptions-view">
            <header className="dp-rx-header">
              <div className="dp-rx-header__text">
                <h2>Назначения пациентов</h2>
                <p className="dp-rx-header__stats">Всего назначений: {activePrescriptionsCount}</p>
              </div>
              <button type="button" className="dp-rx-refresh" onClick={() => void refetchPatients()}>
                <span className="dp-rx-refresh__icon" aria-hidden="true">
                  ↻
                </span>
                Обновить
              </button>
            </header>

            <PrescriptionsForm
              onPrescriptionCreated={refetchPatients}
              initialPatientId={prescriptionPatientId}
              onPatientChange={setPrescriptionPatientId}
            />
          </div>
        )}

        {activeView === 'reports' && (
          <div className="doctor-reports-view">
            <DoctorReportsView />
          </div>
        )}

        {activeView === 'archive' && (
          <div className="doctor-archive-view">
            <ArchivedPatientsPanel allowRestore onRestored={() => void refetchPatients()} />
          </div>
        )}
      </main>

      {modalPatientId && activeView !== 'archive' && activeView !== 'patients' && (
        <div className="modal-overlay" onClick={closePatientCard}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <PatientCard
              patientId={modalPatientId}
              onClose={closePatientCard}
              onPatientArchived={handlePatientArchived}
              cardTab={cardTab}
              onCardTabChange={setCardTab}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorDashboardPage;