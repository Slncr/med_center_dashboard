import React, { useState, useEffect, useCallback } from 'react';
import { usePatients } from '../hooks/usePatients';
import { apiService } from '../services/api';
import { Prescription } from '../types';
import PatientList from '../components/nurse-station/PatientList';
import MedicalForm530n from '../components/nurse-station/MedicalForm530n';
import AppointmentsView from '../components/nurse-station/AppointmentsView';
import { BraceletAlertsPanel } from '../components/bracelet-monitoring';
import ArchivedPatientsPanel from '../components/shared/ArchivedPatientsPanel';
import NurseRoomMonitor from '../components/nurse-station/NurseRoomMonitor';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';
import { useUrlNumberParam, useUrlTab } from '../hooks/useUrlSearchState';
import { NURSE_TABS, NurseTab, PatientCardTab, URL_PARAMS } from '../utils/urlTabs';
import {
  PrescriptionNotificationPayload,
  queuePrescriptionNotification,
  showBatchPrescriptionNotification,
} from '../utils/prescriptionNotifications';
import type { NotificationInput } from '../components/common/NotificationToast';
import './NurseDashboardPage.css';

const NurseDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useUrlTab(URL_PARAMS.tab, NURSE_TABS, 'patients');
  const [selectedPatientId, setSelectedPatientId] = useUrlNumberParam(URL_PARAMS.patient);
  const [cardPatientId, setCardPatientId] = useUrlNumberParam(URL_PARAMS.card);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { patients, rooms, loading, error, refetch } = usePatients();
  const navigate = useNavigate();

  const switchTab = useCallback(
    (tab: NurseTab) => {
      if (tab === 'patients' || tab === 'archive') {
        setActiveTab(tab);
        return;
      }
      setActiveTab(tab, {
        [URL_PARAMS.card]: null,
        [URL_PARAMS.cardTab]: null,
      });
    },
    [setActiveTab],
  );

  const openPatientAppointments = useCallback(
    (patientId: number) => {
      setActiveTab('appointments', {
        [URL_PARAMS.patient]: patientId,
        [URL_PARAMS.card]: null,
        [URL_PARAMS.cardTab]: null,
      });
    },
    [setActiveTab],
  );

  const openPatientCard = useCallback(
    (patientId: number, tab: PatientCardTab = 'observations') => {
      setActiveTab('patients', {
        [URL_PARAMS.card]: patientId,
        [URL_PARAMS.cardTab]: tab === 'observations' ? null : tab,
      });
    },
    [setActiveTab],
  );

  const closePatientCard = useCallback(() => {
    setCardPatientId(null, { [URL_PARAMS.cardTab]: null });
  }, [setCardPatientId]);

  // Deep-link ?card= без tab=patients|archive — открыть карточку на вкладке «Пациенты»
  useEffect(() => {
    if (!cardPatientId) return;
    if (activeTab === 'patients' || activeTab === 'archive') return;
    setActiveTab('patients');
  }, [cardPatientId, activeTab, setActiveTab]);

  const showPrescriptionAlert = useCallback(
    (payload: PrescriptionNotificationPayload) => {
      const countLabel =
        payload.count === 1
          ? '1 новое назначение'
          : `${payload.count} новых назначений`;

      const notification: NotificationInput = {
        type: 'info',
        title: 'Новые назначения',
        message: `${countLabel} для ${payload.patientName}`,
        groupKey: `prescriptions-patient-${payload.patientId}`,
        duration: 15000,
        action: {
          label: 'Перейти к пациенту',
          patientId: payload.patientId,
        },
      };

      (window as Window & { showNotification?: (n: NotificationInput) => void }).showNotification?.(
        notification,
      );
    },
    [],
  );

  useEffect(() => {
    (window as Window & { navigateToPatient?: (patientId: number) => void }).navigateToPatient =
      openPatientAppointments;
    return () => {
      delete (window as Window & { navigateToPatient?: (patientId: number) => void }).navigateToPatient;
    };
  }, [openPatientAppointments]);

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      if (
        message.type === 'prescriptions_created' ||
        message.type === 'prescription_created' ||
        message.type === 'prescription_cancelled' ||
        message.type === 'prescription_completed'
      ) {
        void refetch();
      }

      if (message.type === 'prescriptions_created') {
        showBatchPrescriptionNotification(message, showPrescriptionAlert);
        if (message.patient_id === selectedPatientId) {
          apiService.getPrescriptions(message.patient_id as number).then((data) => {
            setPrescriptions(
              data.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              ),
            );
          });
        }
        return;
      }

      if (message.type === 'prescription_created') {
        queuePrescriptionNotification(message, showPrescriptionAlert);
        if (message.patient_id === selectedPatientId) {
          setPrescriptions((prev) => [
            {
              id: message.prescription_id,
              patient_id: message.patient_id,
              prescription_type: message.prescription_type,
              name: message.name,
              frequency: message.frequency || '',
              notes: message.notes || '',
              status: 'ACTIVE',
              created_at: message.created_at,
              updated_at: message.created_at,
              start_date: message.created_at,
              created_by: 0,
            },
            ...prev,
          ]);
        }
        return;
      }

      if (message.type === 'prescription_cancelled' && message.patient_id === selectedPatientId) {
        apiService.getPrescriptions(message.patient_id as number).then((data) => {
          setPrescriptions(
            data.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            ),
          );
        });
      }
    },
    [selectedPatientId, showPrescriptionAlert, refetch],
  );

  useWebSocket('nurse', handleWebSocketMessage);

  useEffect(() => {
    if (!selectedPatientId) {
      setPrescriptions([]);
      return;
    }

    const loadPrescriptions = async () => {
      setLoadingPrescriptions(true);
      try {
        const data = await apiService.getPrescriptions(selectedPatientId);
        setPrescriptions(
          data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        );
      } catch (err) {
        console.error('Ошибка загрузки назначений:', err);
      } finally {
        setLoadingPrescriptions(false);
      }
    };

    loadPrescriptions();
  }, [selectedPatientId]);

  const handlePatientSelect = (patientId: number) => {
    openPatientAppointments(patientId);
  };

  const handleSync = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      await apiService.syncWith1C();
      await refetch();
    } catch (err) {
      console.error('Ошибка синхронизации', err);
    } finally {
      setSyncing(false);
    }
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
        <button onClick={() => navigate('/login')} className="retry-button">
          Войти
        </button>
      </div>
    );
  }

  return (
    <div className="nurse-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🩺 Станция медсестры</h1>
        </div>
        <div className="header-right">
          <div className="time-display">
            {new Date().toLocaleDateString('ru-RU')} {new Date().toLocaleTimeString('ru-RU')}
          </div>
          <div className="patient-count">Пациентов: {patients.length}</div>
        </div>
      </header>

      <nav className="nurse-dashboard__nav" aria-label="Разделы станции медсестры">
        <div className="nurse-dashboard__nav-main">
          <button
            type="button"
            className={`nurse-dashboard__tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => switchTab('patients')}
          >
            👥 Пациенты
          </button>
          <button
            type="button"
            className={`nurse-dashboard__tab ${activeTab === 'form530n' ? 'active' : ''}`}
            onClick={() => switchTab('form530n')}
          >
            📋 Форма 530н
          </button>
          <button
            type="button"
            className={`nurse-dashboard__tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => switchTab('appointments')}
          >
            ⏰ Назначения ({prescriptions.filter((p) => p.status === 'ACTIVE').length})
          </button>
          <button
            type="button"
            className={`nurse-dashboard__tab ${activeTab === 'bracelets' ? 'active' : ''}`}
            onClick={() => switchTab('bracelets')}
          >
            ⌚ Браслеты
          </button>
          <button
            type="button"
            className={`nurse-dashboard__tab ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => switchTab('rooms')}
          >
            🏥 Палаты
          </button>
        </div>
        <div className="nurse-dashboard__nav-end">
          <button
            type="button"
            className={`nurse-dashboard__tab nurse-dashboard__tab--archive ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => switchTab('archive')}
          >
            📁 Архив
          </button>
          <button
            type="button"
            className="nurse-dashboard__refresh"
            onClick={() => void handleSync()}
            disabled={syncing}
          >
            {syncing ? 'Обновление…' : 'Обновить'}
          </button>
        </div>
      </nav>

      <main className={`dashboard-content ${activeTab === 'patients' ? 'dashboard-content--patients' : ''}`}>
        {activeTab === 'patients' && (
          <div className="tab-content tab-content--patients">
            <PatientList
              patients={patients}
              rooms={rooms}
              onPatientSelect={handlePatientSelect}
              onPatientsUpdate={refetch}
              cardPatientId={cardPatientId}
              onOpenCard={openPatientCard}
              onCloseCard={closePatientCard}
            />
          </div>
        )}

        {activeTab === 'form530n' && (
          <div className="tab-content tab-content--form530n">
            <MedicalForm530n
              patientId={selectedPatientId}
              onPatientSelect={setSelectedPatientId}
            />
          </div>
        )}

        {activeTab === 'bracelets' && (
          <div className="tab-content tab-content--bracelets">
            <BraceletAlertsPanel />
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="tab-content">
            <ArchivedPatientsPanel allowRestore onRestored={() => void refetch()} />
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="tab-content tab-content--rooms">
            <NurseRoomMonitor rooms={rooms} onPatientSelect={setSelectedPatientId} />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="tab-content tab-content--appointments">
            <AppointmentsView
              patientId={selectedPatientId}
              onPatientSelect={setSelectedPatientId}
              patientOptions={patients}
              rooms={rooms}
            />
          </div>
        )}
      </main>

    </div>
  );
};

export default NurseDashboardPage;
