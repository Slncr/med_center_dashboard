import React, { useState, useEffect, useCallback } from 'react';
import { usePatients } from '../hooks/usePatients';
import { apiService } from '../services/api';
import { Prescription } from '../types';
import PatientList from '../components/nurse-station/PatientList';
import ObservationsTable from '../components/nurse-station/ObservationsTable';
import MedicalForm530n from '../components/nurse-station/MedicalForm530n';
import AppointmentsView from '../components/nurse-station/AppointmentsView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';
import {
  PrescriptionNotificationPayload,
  queuePrescriptionNotification,
  showBatchPrescriptionNotification,
} from '../utils/prescriptionNotifications';
import type { NotificationInput } from '../components/common/NotificationToast';
import './NurseDashboardPage.css';

const NurseDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patients' | 'observations' | 'form530n' | 'appointments'>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const { patients, rooms, loading, error, refetch } = usePatients();
  const navigate = useNavigate();

  const openPatientAppointments = useCallback((patientId: number) => {
    setSelectedPatientId(patientId);
    setActiveTab('appointments');
  }, []);

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
    [selectedPatientId, showPrescriptionAlert],
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
          ⏰ Назначения ({prescriptions.filter((p) => p.status === 'ACTIVE').length})
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'patients' && (
          <div className="tab-content">
            <PatientList
              patients={patients}
              rooms={rooms}
              onPatientSelect={handlePatientSelect}
              onPatientsUpdate={refetch}
            />
          </div>
        )}

        {activeTab === 'observations' && (
          <div className="tab-content">
            <ObservationsTable
              patientId={selectedPatientId}
              onPatientSelect={setSelectedPatientId}
              patients={patients}
              rooms={rooms}
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
              prescriptions={prescriptions}
              loading={loadingPrescriptions}
              onPrescriptionsUpdate={() => {
                if (selectedPatientId) {
                  apiService.getPrescriptions(selectedPatientId).then((data) => {
                    setPrescriptions(
                      data.sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                      ),
                    );
                  });
                }
              }}
            />
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>Медицинский центр • Станция медсестры • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default NurseDashboardPage;
