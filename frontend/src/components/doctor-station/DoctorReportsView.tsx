import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { Patient, Prescription, Room } from '../../types';
import MedicalForm530n from '../nurse-station/MedicalForm530n';
import LoadingSpinner from '../common/LoadingSpinner';
import { useUrlNumberParam, useUrlOptionalTab } from '../../hooks/useUrlSearchState';
import { DOCTOR_REPORTS, DoctorReportKind, URL_PARAMS } from '../../utils/urlTabs';
import './DoctorReportsView.css';

interface DepartmentRow {
  name: string;
  active: number;
  archived: number;
}

interface ReportCardConfig {
  id: DoctorReportKind;
  title: string;
  description: string;
}

const REPORT_CARDS: ReportCardConfig[] = [
  {
    id: 'patients',
    title: 'Статистика по пациентам',
    description: 'Поступления, выписки и загрузка коечного фонда',
  },
  {
    id: 'prescriptions',
    title: 'Статистика по назначениям',
    description: 'Выполнение назначений у активных пациентов',
  },
  {
    id: 'form530n',
    title: 'Форма 530н',
    description: 'Просмотр и печать формы для выбранного пациента',
  },
  {
    id: 'department',
    title: 'Отчёт по отделению',
    description: 'Распределение пациентов по подразделениям',
  },
];

const DoctorReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useUrlOptionalTab(URL_PARAMS.report, DOCTOR_REPORTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [form530PatientId, setForm530PatientId] = useUrlNumberParam(URL_PARAMS.patient);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, archived, roomsData] = await Promise.all([
        apiService.getPatients(),
        apiService.getArchivedPatients(),
        apiService.getRooms(),
      ]);
      setActivePatients(active);
      setArchivedPatients(archived);
      setRooms(roomsData);

      const results = await Promise.allSettled(
        active.map((p) => apiService.getPrescriptions(p.id)),
      );
      const merged: Prescription[] = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled') merged.push(...r.value);
      });
      setAllPrescriptions(merged);
    } catch (err) {
      setError('Не удалось загрузить данные для отчётов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeReport) {
      void loadReportData();
    }
  }, [activeReport, loadReportData]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStart = useMemo(() => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [todayStart]);

  const patientStats = useMemo(() => {
    const admittedToday = activePatients.filter((p) => {
      const a = new Date(p.admission_date);
      a.setHours(0, 0, 0, 0);
      return a.getTime() === todayStart.getTime();
    }).length;

    const dischargedToday = archivedPatients.filter((p) => {
      if (!p.discharge_date) return false;
      const d = new Date(p.discharge_date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === todayStart.getTime();
    }).length;

    const dischargedWeek = archivedPatients.filter((p) => {
      if (!p.discharge_date) return false;
      return new Date(p.discharge_date) >= weekStart;
    }).length;

    const totalBeds = rooms.reduce((sum, r) => sum + (r.beds?.length ?? r.max_beds ?? 0), 0);
    const occupiedBeds = activePatients.filter((p) => p.bed_id).length;

    return {
      active: activePatients.length,
      archived: archivedPatients.length,
      admittedToday,
      dischargedToday,
      dischargedWeek,
      totalBeds,
      occupiedBeds,
      freeBeds: Math.max(0, totalBeds - occupiedBeds),
    };
  }, [activePatients, archivedPatients, rooms, todayStart, weekStart]);

  const prescriptionStats = useMemo(() => {
    const today = allPrescriptions.filter((p) => {
      const c = new Date(p.created_at);
      c.setHours(0, 0, 0, 0);
      return c.getTime() === todayStart.getTime();
    });

    const byStatus = {
      ACTIVE: allPrescriptions.filter((p) => p.status === 'ACTIVE').length,
      COMPLETED: allPrescriptions.filter((p) => p.status === 'COMPLETED').length,
      CANCELLED: allPrescriptions.filter((p) => p.status === 'CANCELLED').length,
    };

    const byType = {
      PROCEDURE: allPrescriptions.filter((p) => p.prescription_type === 'PROCEDURE').length,
      MEASUREMENT: allPrescriptions.filter((p) => p.prescription_type === 'MEASUREMENT').length,
      NOTE: allPrescriptions.filter((p) => p.prescription_type === 'NOTE').length,
    };

    const completionRate =
      allPrescriptions.length > 0
        ? Math.round((byStatus.COMPLETED / allPrescriptions.length) * 100)
        : 0;

    return { today: today.length, byStatus, byType, total: allPrescriptions.length, completionRate };
  }, [allPrescriptions, todayStart]);

  const departmentRows = useMemo((): DepartmentRow[] => {
    const map = new Map<string, DepartmentRow>();

    const ensure = (name: string) => {
      const key = name || 'Без подразделения';
      if (!map.has(key)) map.set(key, { name: key, active: 0, archived: 0 });
      return map.get(key)!;
    };

    activePatients.forEach((p) => {
      ensure(p.department_name || '').active += 1;
    });
    archivedPatients.forEach((p) => {
      ensure(p.department_name || '').archived += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.active - a.active);
  }, [activePatients, archivedPatients]);

  const allPatientsForForm = useMemo(
    () => [...activePatients, ...archivedPatients],
    [activePatients, archivedPatients],
  );

  const openReport = (kind: DoctorReportKind) => {
    setActiveReport(kind);
    if (kind === 'form530n' && !form530PatientId && activePatients[0]) {
      setForm530PatientId(activePatients[0].id);
    }
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const body = rows.map((r) => r.map(escape).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPatientStats = () => {
    downloadCsv('patients-report.csv', [
      ['Показатель', 'Значение'],
      ['Активных', String(patientStats.active)],
      ['В архиве', String(patientStats.archived)],
      ['Поступило сегодня', String(patientStats.admittedToday)],
      ['Выписано сегодня', String(patientStats.dischargedToday)],
      ['Выписано за 7 дней', String(patientStats.dischargedWeek)],
      ['Коек всего', String(patientStats.totalBeds)],
      ['Занято', String(patientStats.occupiedBeds)],
      ['Свободно', String(patientStats.freeBeds)],
    ]);
  };

  const exportPrescriptionStats = () => {
    downloadCsv('prescriptions-report.csv', [
      ['Показатель', 'Значение'],
      ['Всего назначений (активные пациенты)', String(prescriptionStats.total)],
      ['Создано сегодня', String(prescriptionStats.today)],
      ['Активных', String(prescriptionStats.byStatus.ACTIVE)],
      ['Выполнено', String(prescriptionStats.byStatus.COMPLETED)],
      ['Отменено', String(prescriptionStats.byStatus.CANCELLED)],
      ['Процедуры', String(prescriptionStats.byType.PROCEDURE)],
      ['Измерения', String(prescriptionStats.byType.MEASUREMENT)],
      ['Заметки', String(prescriptionStats.byType.NOTE)],
      ['% выполнения', String(prescriptionStats.completionRate)],
    ]);
  };

  const exportDepartmentStats = () => {
    downloadCsv('department-report.csv', [
      ['Подразделение', 'На лечении', 'В архиве'],
      ...departmentRows.map((r) => [r.name, String(r.active), String(r.archived)]),
    ]);
  };

  return (
    <div className="dr-page">
      <h2 className="dr-page__title">Медицинские отчёты</h2>

      <div className="dr-cards">
        {REPORT_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`dr-card ${activeReport === card.id ? 'is-active' : ''}`}
            onClick={() => openReport(card.id)}
          >
            <div className="dr-card__icon" aria-hidden="true" />
            <h3 className="dr-card__title">{card.title}</h3>
            <p className="dr-card__desc">{card.description}</p>
          </button>
        ))}
      </div>

      {error && <div className="dr-error">{error}</div>}

      {activeReport && activeReport !== 'form530n' && loading && (
        <div className="dr-panel dr-panel--loading">
          <LoadingSpinner size="medium" />
          <p>Загрузка данных…</p>
        </div>
      )}

      {activeReport === 'patients' && !loading && (
        <div className="dr-panel">
          <div className="dr-panel__head">
            <h3>Статистика по пациентам</h3>
            <button type="button" className="dr-btn dr-btn-outline" onClick={exportPatientStats}>
              CSV
            </button>
          </div>
          <div className="dr-stats">
            <div className="dr-stat">
              <span className="dr-stat__label">На лечении</span>
              <span className="dr-stat__value">{patientStats.active}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">В архиве</span>
              <span className="dr-stat__value">{patientStats.archived}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Поступило сегодня</span>
              <span className="dr-stat__value">{patientStats.admittedToday}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Выписано сегодня</span>
              <span className="dr-stat__value">{patientStats.dischargedToday}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Выписано за 7 дней</span>
              <span className="dr-stat__value">{patientStats.dischargedWeek}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Коек / занято / свободно</span>
              <span className="dr-stat__value">
                {patientStats.totalBeds} / {patientStats.occupiedBeds} / {patientStats.freeBeds}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'prescriptions' && !loading && (
        <div className="dr-panel">
          <div className="dr-panel__head">
            <h3>Статистика по назначениям</h3>
            <button type="button" className="dr-btn dr-btn-outline" onClick={exportPrescriptionStats}>
              CSV
            </button>
          </div>
          <div className="dr-stats">
            <div className="dr-stat">
              <span className="dr-stat__label">Всего (активные пациенты)</span>
              <span className="dr-stat__value">{prescriptionStats.total}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Создано сегодня</span>
              <span className="dr-stat__value">{prescriptionStats.today}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Активных / выполнено / отменено</span>
              <span className="dr-stat__value">
                {prescriptionStats.byStatus.ACTIVE} / {prescriptionStats.byStatus.COMPLETED} /{' '}
                {prescriptionStats.byStatus.CANCELLED}
              </span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Процедуры / измерения / заметки</span>
              <span className="dr-stat__value">
                {prescriptionStats.byType.PROCEDURE} / {prescriptionStats.byType.MEASUREMENT} /{' '}
                {prescriptionStats.byType.NOTE}
              </span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat__label">Доля выполненных</span>
              <span className="dr-stat__value">{prescriptionStats.completionRate}%</span>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'department' && !loading && (
        <div className="dr-panel">
          <div className="dr-panel__head">
            <h3>Отчёт по подразделениям</h3>
            <button type="button" className="dr-btn dr-btn-outline" onClick={exportDepartmentStats}>
              CSV
            </button>
          </div>
          {departmentRows.length === 0 ? (
            <p className="dr-empty">Нет данных по подразделениям</p>
          ) : (
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead>
                  <tr>
                    <th>Подразделение</th>
                    <th>На лечении</th>
                    <th>В архиве</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.active}</td>
                      <td>{row.archived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeReport === 'form530n' && (
        <div className="dr-form530">
          <MedicalForm530n
            patientId={form530PatientId}
            onPatientSelect={setForm530PatientId}
            patientOptions={allPatientsForForm}
          />
        </div>
      )}
    </div>
  );
};

export default DoctorReportsView;
