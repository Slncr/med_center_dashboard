import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Patient, Room } from '../../types';
import PatientCard from '../nurse-station/PatientCard';
import { useUrlNumberParam, useUrlTab } from '../../hooks/useUrlSearchState';
import { PATIENT_CARD_TABS, URL_PARAMS } from '../../utils/urlTabs';
import '../nurse-station/PatientList.css';
import './ArchivedPatientsPanel.css';

interface ArchivedPatientsPanelProps {
  /** Показать кнопку «Вернуть из архива» */
  allowRestore?: boolean;
  onRestored?: () => void;
}

const ArchivedPatientsPanel: React.FC<ArchivedPatientsPanelProps> = ({
  allowRestore = true,
  onRestored,
}) => {
  const [modalPatientId, setModalPatientId] = useUrlNumberParam(URL_PARAMS.card);
  const [cardTab, setCardTab] = useUrlTab(URL_PARAMS.cardTab, PATIENT_CARD_TABS, 'observations');
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsData, roomsData] = await Promise.all([
        apiService.getArchivedPatients(),
        apiService.getRooms(),
      ]);
      setArchivedPatients(patientsData);
      setRooms(roomsData);
    } catch (err) {
      setError('Ошибка загрузки архива');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getPatientRoomAndBed = (patient: Patient) => {
    if (!patient.bed_id) return { room: undefined, bed: undefined };
    for (const room of rooms) {
      const bed = room.beds.find((b) => b.id === patient.bed_id);
      if (bed) return { room, bed };
    }
    return { room: undefined, bed: undefined };
  };

  const handleRestore = async (patientId: number) => {
    if (!window.confirm('Вернуть пациента из архива в активные?')) return;
    setRestoringId(patientId);
    setError(null);
    try {
      await apiService.restorePatient(patientId);
      setArchivedPatients((prev) => prev.filter((p) => p.id !== patientId));
      if (modalPatientId === patientId) {
        setModalPatientId(null, { [URL_PARAMS.cardTab]: null });
      }
      onRestored?.();
    } catch (err) {
      setError('Ошибка восстановления пациента');
      console.error(err);
    } finally {
      setRestoringId(null);
    }
  };

  const openCard = (patientId: number) => {
    setModalPatientId(patientId);
  };

  const closeCard = () => {
    setModalPatientId(null, { [URL_PARAMS.cardTab]: null });
  };

  return (
    <div className="archived-panel">
      <div className="archived-panel-toolbar">
        <p className="archived-panel-hint">
          Выписанные пациенты. Откройте карточку, чтобы посмотреть наблюдения, назначения и прочие данные.
        </p>
        <button type="button" className="archived-refresh-btn" onClick={() => void loadData()} disabled={loading}>
          🔄 Обновить
        </button>
      </div>

      {loading && archivedPatients.length === 0 && (
        <p className="archived-panel-loading">Загрузка архива...</p>
      )}
      {error && <div className="archived-panel-error">{error}</div>}

      {!loading && archivedPatients.length === 0 ? (
        <div className="empty-list">
          <p>В архиве нет пациентов</p>
        </div>
      ) : (
        <div className="patient-list archived-patient-list">
          <div className="patients-grid">
            {archivedPatients.map((patient) => {
              const { room, bed } = getPatientRoomAndBed(patient);
              return (
                <div key={patient.id} className="patient-card archived">
                  <div className="patient-header">
                    <h3>{patient.full_name}</h3>
                    <span className="patient-status discharged">Выписан</span>
                  </div>

                  <div className="patient-info">
                    <div className="info-row">
                      <span className="info-label">Палата:</span>
                      <span className="info-value">{room ? room.number : '—'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Койка:</span>
                      <span className="info-value">{bed ? bed.number : patient.bed_id || '—'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Поступил:</span>
                      <span className="info-value">
                        {new Date(patient.admission_date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Выписан:</span>
                      <span className="info-value">
                        {patient.discharge_date
                          ? new Date(patient.discharge_date).toLocaleDateString('ru-RU')
                          : '—'}
                      </span>
                    </div>
                    {patient.department_name && (
                      <div className="info-row">
                        <span className="info-label">Подразделение:</span>
                        <span className="info-value">{patient.department_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="patient-actions">
                    <button
                      type="button"
                      className="action-button view-button"
                      onClick={() => openCard(patient.id)}
                    >
                      Карта
                    </button>
                    {allowRestore && (
                      <button
                        type="button"
                        className="action-button restore-button"
                        disabled={restoringId === patient.id}
                        onClick={() => void handleRestore(patient.id)}
                      >
                        {restoringId === patient.id ? '…' : 'Вернуть'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalPatientId && (
        <PatientCard
          patientId={modalPatientId}
          onClose={closeCard}
          readOnly
          cardTab={cardTab}
          onCardTabChange={setCardTab}
          onPatientArchived={() => {
            closeCard();
            void loadData();
          }}
        />
      )}
    </div>
  );
};

export default ArchivedPatientsPanel;
