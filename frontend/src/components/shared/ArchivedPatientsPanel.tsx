import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../../services/api';
import { Patient, Room } from '../../types';
import PatientCard from '../nurse-station/PatientCard';
import { useUrlNumberParam, useUrlTab } from '../../hooks/useUrlSearchState';
import { PATIENT_CARD_TABS, URL_PARAMS } from '../../utils/urlTabs';
import { appConfirm } from '../../context/AppDialogContext';
import './ArchivedPatientsPanel.css';

interface ArchivedPatientsPanelProps {
  /** Показать кнопку «Вернуть из архива» */
  allowRestore?: boolean;
  onRestored?: () => void;
}

type SortKey = 'room' | 'admission' | 'discharge';
type SortDir = 'asc' | 'desc';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
}

function formatBedNumber(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = Number(value);
  if (!Number.isNaN(n) && Number.isInteger(n)) {
    return String(n).padStart(2, '0');
  }
  return String(value);
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
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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

  const getPatientRoomAndBed = useCallback(
    (patient: Patient) => {
      if (!patient.bed_id) return { room: undefined, bed: undefined };
      for (const room of rooms) {
        const bed = room.beds.find((b) => b.id === patient.bed_id);
        if (bed) return { room, bed };
      }
      return { room: undefined, bed: undefined };
    },
    [rooms],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const sortedPatients = useMemo(() => {
    if (!sortKey) return archivedPatients;

    const list = [...archivedPatients];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortKey === 'room') {
        const roomA = getPatientRoomAndBed(a).room?.number ?? '';
        const roomB = getPatientRoomAndBed(b).room?.number ?? '';
        const numA = Number(roomA);
        const numB = Number(roomB);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          return (numA - numB) * dir;
        }
        return String(roomA).localeCompare(String(roomB), 'ru') * dir;
      }

      if (sortKey === 'admission') {
        return (
          (new Date(a.admission_date).getTime() - new Date(b.admission_date).getTime()) * dir
        );
      }

      const dateA = a.discharge_date ? new Date(a.discharge_date).getTime() : 0;
      const dateB = b.discharge_date ? new Date(b.discharge_date).getTime() : 0;
      return (dateA - dateB) * dir;
    });

    return list;
  }, [archivedPatients, sortKey, sortDir, getPatientRoomAndBed]);

  const handleRestore = async (patientId: number) => {
    if (!(await appConfirm('Вернуть пациента из архива в активные?'))) return;
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

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="archived-panel">
      <h2 className="archived-panel__title">Архив пациентов</h2>

      {loading && archivedPatients.length === 0 && (
        <p className="archived-panel__loading">Загрузка архива…</p>
      )}
      {error && <div className="archived-panel__error">{error}</div>}

      {!loading && archivedPatients.length === 0 ? (
        <div className="archived-panel__empty">
          <p>В архиве нет пациентов</p>
        </div>
      ) : (
        <div className="archived-table-wrap">
          <table className="archived-table">
            <thead>
              <tr>
                <th className="archived-table__th-name">Список пациентов</th>
                <th className="archived-table__th-center">
                  <button type="button" className="archived-table__sort" onClick={() => toggleSort('room')}>
                    Палата <span aria-hidden="true">{sortIcon('room')}</span>
                  </button>
                </th>
                <th className="archived-table__th-center">Койка</th>
                <th className="archived-table__th-center">
                  <button
                    type="button"
                    className="archived-table__sort"
                    onClick={() => toggleSort('admission')}
                  >
                    Поступил <span aria-hidden="true">{sortIcon('admission')}</span>
                  </button>
                </th>
                <th className="archived-table__th-center">
                  <button
                    type="button"
                    className="archived-table__sort"
                    onClick={() => toggleSort('discharge')}
                  >
                    Выписан <span aria-hidden="true">{sortIcon('discharge')}</span>
                  </button>
                </th>
                <th className="archived-table__th-actions">Действие</th>
              </tr>
            </thead>
            <tbody>
              {sortedPatients.map((patient) => {
                const { room, bed } = getPatientRoomAndBed(patient);
                return (
                  <tr key={patient.id}>
                    <td className="archived-table__name">{patient.full_name}</td>
                    <td>{room ? room.number : '—'}</td>
                    <td>{bed ? formatBedNumber(bed.number) : '—'}</td>
                    <td>{formatDate(patient.admission_date)}</td>
                    <td>{formatDate(patient.discharge_date)}</td>
                    <td>
                      <div className="archived-table__actions">
                        <button
                          type="button"
                          className="archived-table__btn"
                          onClick={() => openCard(patient.id)}
                        >
                          Карта пациента
                        </button>
                        {allowRestore && (
                          <button
                            type="button"
                            className="archived-table__btn"
                            disabled={restoringId === patient.id}
                            onClick={() => void handleRestore(patient.id)}
                          >
                            {restoringId === patient.id ? '…' : 'Вернуть'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
