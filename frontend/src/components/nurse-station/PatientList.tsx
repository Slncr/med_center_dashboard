import React, { useEffect, useMemo, useState } from 'react';
import { Patient, Prescription, Room } from '../../types';
import './PatientList.css';
import PatientCard from './PatientCard';
import apiService from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { useUrlTab } from '../../hooks/useUrlSearchState';
import { PATIENT_CARD_TABS, PatientCardTab, URL_PARAMS } from '../../utils/urlTabs';

type PatientFilter =
  | 'all'
  | 'awaiting'
  | 'active_prescriptions'
  | 'completed_prescriptions'
  | 'discharge';

const statImage = (name: string) => `${process.env.PUBLIC_URL}/images/${name}`;

interface PatientListProps {
  patients: Patient[];
  rooms: Room[];
  onPatientSelect: (patientId: number) => void;
  onPatientsUpdate?: () => void;
  cardPatientId?: number | null;
  onOpenCard: (patientId: number, tab?: PatientCardTab) => void;
  onCloseCard: () => void;
}

const PatientList: React.FC<PatientListProps> = ({
  patients,
  rooms,
  onPatientsUpdate,
  cardPatientId = null,
  onOpenCard,
  onCloseCard,
}) => {
  const [cardTab, setCardTab] = useUrlTab(URL_PARAMS.cardTab, PATIENT_CARD_TABS, 'observations');
  const [activeFilter, setActiveFilter] = useState<PatientFilter>('all');
  const [prescriptionsByPatient, setPrescriptionsByPatient] = useState<Map<number, Prescription[]>>(
    () => new Map(),
  );
  const [observationsByPatient, setObservationsByPatient] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    if (patients.length === 0) {
      setPrescriptionsByPatient(new Map());
      setObservationsByPatient(new Map());
      setMetaLoading(false);
      return;
    }

    let cancelled = false;

    const loadPatientMeta = async () => {
      setMetaLoading(true);
      try {
        const results = await Promise.all(
          patients.map(async (patient) => {
            const [prescriptionsResult, observationsResult] = await Promise.allSettled([
              apiService.getPrescriptions(patient.id),
              apiService.getObservations(patient.id),
            ]);

            return {
              patientId: patient.id,
              prescriptions:
                prescriptionsResult.status === 'fulfilled' ? prescriptionsResult.value : [],
              observationsCount:
                observationsResult.status === 'fulfilled' ? observationsResult.value.length : 0,
            };
          }),
        );

        if (cancelled) return;

        const prescriptionsMap = new Map<number, Prescription[]>();
        const observationsMap = new Map<number, number>();

        results.forEach(({ patientId, prescriptions, observationsCount }) => {
          prescriptionsMap.set(patientId, prescriptions);
          observationsMap.set(patientId, observationsCount);
        });

        setPrescriptionsByPatient(prescriptionsMap);
        setObservationsByPatient(observationsMap);
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    };

    void loadPatientMeta();

    return () => {
      cancelled = true;
    };
  }, [patients]);

  const handlePatientArchived = () => {
    onPatientsUpdate?.();
  };

  const getPatientRoomAndBed = (patient: Patient) => {
    for (const room of rooms) {
      const bed = room.beds.find((b) => b.id === patient.bed_id);
      if (bed) {
        return { room, bed };
      }
    }
    return { room: undefined, bed: undefined };
  };

  const stats = useMemo(() => {
    let awaiting = 0;
    let activePrescriptions = 0;
    let completedPrescriptions = 0;
    let readyForDischarge = 0;

    patients.forEach((patient) => {
      const prescriptions = prescriptionsByPatient.get(patient.id) ?? [];
      const observationsCount = observationsByPatient.get(patient.id) ?? 0;

      if (prescriptions.length === 0 && observationsCount === 0) awaiting += 1;
      if (prescriptions.some((item) => item.status === 'ACTIVE')) activePrescriptions += 1;
      if (prescriptions.length > 0 && prescriptions.every((item) => item.status === 'COMPLETED')) {
        completedPrescriptions += 1;
      }
      if (prescriptions.length > 0 && !prescriptions.some((item) => item.status === 'ACTIVE')) {
        readyForDischarge += 1;
      }
    });

    return {
      activePatients: patients.length,
      awaitingExamination: awaiting,
      activePrescriptions,
      completedPrescriptions,
      readyForDischarge,
    };
  }, [patients, prescriptionsByPatient, observationsByPatient]);

  const filteredPatients = useMemo(() => {
    switch (activeFilter) {
      case 'awaiting':
        return patients.filter((patient) => {
          const prescriptions = prescriptionsByPatient.get(patient.id) ?? [];
          const observationsCount = observationsByPatient.get(patient.id) ?? 0;
          return prescriptions.length === 0 && observationsCount === 0;
        });
      case 'active_prescriptions':
        return patients.filter((patient) =>
          (prescriptionsByPatient.get(patient.id) ?? []).some((item) => item.status === 'ACTIVE'),
        );
      case 'completed_prescriptions':
        return patients.filter((patient) => {
          const prescriptions = prescriptionsByPatient.get(patient.id) ?? [];
          return prescriptions.length > 0 && prescriptions.every((item) => item.status === 'COMPLETED');
        });
      case 'discharge':
      case 'all':
      default:
        return patients;
    }
  }, [patients, activeFilter, prescriptionsByPatient, observationsByPatient]);

  const getPatientStatus = (patientId: number) => {
    const prescriptions = prescriptionsByPatient.get(patientId) ?? [];
    const observationsCount = observationsByPatient.get(patientId) ?? 0;

    if (prescriptions.length === 0 && observationsCount === 0) {
      return { label: 'ожидает осмотра', variant: 'awaiting' as const };
    }
    if (prescriptions.some((item) => item.status === 'ACTIVE')) {
      return { label: 'есть назначения', variant: 'prescriptions' as const };
    }
    if (prescriptions.length > 0 && prescriptions.every((item) => item.status === 'COMPLETED')) {
      return { label: 'назначения выполнены', variant: 'completed' as const };
    }
    if (prescriptions.length > 0 && !prescriptions.some((item) => item.status === 'ACTIVE')) {
      return { label: 'готов к выписке', variant: 'discharge' as const };
    }
    return { label: 'активный', variant: 'active' as const };
  };

  return (
    <div className="nurse-patient-list">
      <div className="nurse-patient-list__stats">
        <button
          type="button"
          className={`nurse-stat-card nurse-stat-card--primary ${activeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <div className="stat-card-header">
            <h3>Активные пациенты</h3>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-icon" aria-hidden>
              <img className="stat-card-icon-img" src={statImage('chelik.png')} alt="" />
            </span>
            <div className="stat-card-metrics">
              <span className="stat-value">{stats.activePatients}</span>
              <span className="stat-desc">на лечении</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`nurse-stat-card nurse-stat-card--warning ${activeFilter === 'awaiting' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('awaiting')}
        >
          <div className="stat-card-header">
            <h3>Ожидают осмотра</h3>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-icon" aria-hidden>
              <img className="stat-card-icon-img" src={statImage('w8.png')} alt="" />
            </span>
            <div className="stat-card-metrics">
              <span className="stat-value">{stats.awaitingExamination}</span>
              <span className="stat-desc">без назначений и наблюдений</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`nurse-stat-card nurse-stat-card--info ${activeFilter === 'active_prescriptions' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('active_prescriptions')}
        >
          <div className="stat-card-header">
            <h3>Назначений сегодня</h3>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-icon" aria-hidden>
              <img className="stat-card-icon-img" src={statImage('pen.png')} alt="" />
            </span>
            <div className="stat-card-metrics">
              <span className="stat-value">{stats.activePrescriptions}</span>
              <span className="stat-desc">не выполнены</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`nurse-stat-card nurse-stat-card--neutral ${activeFilter === 'completed_prescriptions' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('completed_prescriptions')}
        >
          <div className="stat-card-header">
            <h3>Выполнено назначений</h3>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-icon" aria-hidden>
              <img className="stat-card-icon-img" src={statImage('complete.png')} alt="" />
            </span>
            <div className="stat-card-metrics">
              <span className="stat-value">{stats.completedPrescriptions}</span>
              <span className="stat-desc">пакет выполнен</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="nurse-stat-card nurse-stat-card--success nurse-stat-card--disabled"
          disabled
          title="Фильтр будет добавлен позже"
        >
          <div className="stat-card-header">
            <h3>Готовы к выписке</h3>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-icon" aria-hidden>✅</span>
            <div className="stat-card-metrics">
              <span className="stat-value">{stats.readyForDischarge}</span>
              <span className="stat-desc">скоро</span>
            </div>
          </div>
        </button>
      </div>

      <div className="nurse-patient-table-wrap">
        {metaLoading ? (
          <div className="nurse-patient-table-loading">
            <LoadingSpinner size="medium" />
            <p>Загрузка данных пациентов…</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="nurse-patient-table-empty">
            <p>Нет пациентов по выбранному фильтру</p>
          </div>
        ) : (
          <table className="nurse-patient-table">
            <thead>
              <tr>
                <th className="nurse-patient-table__th-name">Список пациентов</th>
                <th className="nurse-patient-table__th-center">Палата</th>
                <th className="nurse-patient-table__th-center">Койка</th>
                <th className="nurse-patient-table__th-center">Поступил</th>
                <th className="nurse-patient-table__th-center">Статус</th>
                <th className="nurse-patient-table__th-center">Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => {
                const { room, bed } = getPatientRoomAndBed(patient);
                const status = getPatientStatus(patient.id);

                return (
                  <tr key={patient.id}>
                    <td className="nurse-patient-table__name">{patient.full_name}</td>
                    <td>{room ? room.number : '—'}</td>
                    <td>{bed ? bed.number : '—'}</td>
                    <td>{new Date(patient.admission_date).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <span
                        className={`nurse-patient-table__status nurse-patient-table__status--${status.variant}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="nurse-patient-table__card-btn"
                        onClick={() => onOpenCard(patient.id)}
                      >
                        Карта пациента
                        <span className="nurse-patient-table__card-arrow" aria-hidden>→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {cardPatientId && (
        <div className="modal-overlay" onClick={onCloseCard}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <PatientCard
              patientId={cardPatientId}
              onClose={onCloseCard}
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

export default PatientList;
