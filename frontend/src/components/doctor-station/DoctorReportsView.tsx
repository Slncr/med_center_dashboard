import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { Patient, Prescription, Room } from '../../types';
import MedicalForm530n from '../nurse-station/MedicalForm530n';
import LoadingSpinner from '../common/LoadingSpinner';
import { useUrlNumberParam, useUrlOptionalTab } from '../../hooks/useUrlSearchState';
import { DOCTOR_REPORTS, DoctorReportKind, URL_PARAMS } from '../../utils/urlTabs';
import './DoctorReportsView.css';
import '../nurse-station/MedicalForm530n.css';

interface DepartmentRow {
  name: string;
  active: number;
  archived: number;
}

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
    if (activeReport === kind) {
      setActiveReport(null);
      return;
    }
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
    <div className="doctor-reports">
      <div className="reports-grid">
        <div className="report-card">
          <h3>📊 Статистика по пациентам</h3>
          <p>Поступления, выписки и загрузка коечного фонда</p>
          <button type="button" className="report-btn" onClick={() => openReport('patients')}>
            {activeReport === 'patients' ? 'Скрыть' : 'Сформировать отчёт'}
          </button>
        </div>

        <div className="report-card">
          <h3>💊 Статистика по назначениям</h3>
          <p>Выполнение назначений у активных пациентов</p>
          <button type="button" className="report-btn" onClick={() => openReport('prescriptions')}>
            {activeReport === 'prescriptions' ? 'Скрыть' : 'Сформировать отчёт'}
          </button>
        </div>

        <div className="report-card">
          <h3>📋 Форма 530н</h3>
          <p>Просмотр и печать формы для выбранного пациента</p>
          <button type="button" className="report-btn" onClick={() => openReport('form530n')}>
            {activeReport === 'form530n' ? 'Скрыть' : 'Открыть форму'}
          </button>
        </div>

        <div className="report-card">
          <h3>🏥 Отчёт по отделению</h3>
          <p>Распределение пациентов по подразделениям</p>
          <button type="button" className="report-btn" onClick={() => openReport('department')}>
            {activeReport === 'department' ? 'Скрыть' : 'Сформировать отчёт'}
          </button>
        </div>
      </div>

      {activeReport && activeReport !== 'form530n' && loading && (
        <div className="report-panel loading">
          <LoadingSpinner size="medium" />
          <p>Загрузка данных...</p>
        </div>
      )}

      {error && <div className="report-panel-error">{error}</div>}

      {activeReport === 'patients' && !loading && (
        <div className="report-panel">
          <div className="report-panel-head">
            <h3>Статистика по пациентам</h3>
            <button type="button" className="report-export-btn" onClick={exportPatientStats}>
              ⬇ CSV
            </button>
          </div>
          <div className="report-stats-grid">
            <div className="report-stat">
              <span className="report-stat-label">На лечении</span>
              <span className="report-stat-value">{patientStats.active}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">В архиве</span>
              <span className="report-stat-value">{patientStats.archived}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Поступило сегодня</span>
              <span className="report-stat-value">{patientStats.admittedToday}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Выписано сегодня</span>
              <span className="report-stat-value">{patientStats.dischargedToday}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Выписано за 7 дней</span>
              <span className="report-stat-value">{patientStats.dischargedWeek}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Коек / занято / свободно</span>
              <span className="report-stat-value">
                {patientStats.totalBeds} / {patientStats.occupiedBeds} / {patientStats.freeBeds}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'prescriptions' && !loading && (
        <div className="report-panel">
          <div className="report-panel-head">
            <h3>Статистика по назначениям</h3>
            <button type="button" className="report-export-btn" onClick={exportPrescriptionStats}>
              ⬇ CSV
            </button>
          </div>
          <div className="report-stats-grid">
            <div className="report-stat">
              <span className="report-stat-label">Всего (активные пациенты)</span>
              <span className="report-stat-value">{prescriptionStats.total}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Создано сегодня</span>
              <span className="report-stat-value">{prescriptionStats.today}</span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Активных / выполнено / отменено</span>
              <span className="report-stat-value">
                {prescriptionStats.byStatus.ACTIVE} / {prescriptionStats.byStatus.COMPLETED} /{' '}
                {prescriptionStats.byStatus.CANCELLED}
              </span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Процедуры / измерения / заметки</span>
              <span className="report-stat-value">
                {prescriptionStats.byType.PROCEDURE} / {prescriptionStats.byType.MEASUREMENT} /{' '}
                {prescriptionStats.byType.NOTE}
              </span>
            </div>
            <div className="report-stat">
              <span className="report-stat-label">Доля выполненных</span>
              <span className="report-stat-value">{prescriptionStats.completionRate}%</span>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'department' && !loading && (
        <div className="report-panel">
          <div className="report-panel-head">
            <h3>Отчёт по подразделениям</h3>
            <button type="button" className="report-export-btn" onClick={exportDepartmentStats}>
              ⬇ CSV
            </button>
          </div>
          {departmentRows.length === 0 ? (
            <p className="report-empty">Нет данных по подразделениям</p>
          ) : (
            <table className="report-table">
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
          )}
        </div>
      )}

      {activeReport === 'form530n' && (
        <div className="report-panel report-panel-form530">
          <div className="report-form530-toolbar">
            <label>
              Пациент:
              <select
                value={form530PatientId ?? ''}
                onChange={(e) => setForm530PatientId(Number(e.target.value) || null)}
              >
                <option value="">— Выберите —</option>
                <optgroup label="На лечении">
                  {activePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </optgroup>
                {archivedPatients.length > 0 && (
                  <optgroup label="Архив">
                    {archivedPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} (архив)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <button
              type="button"
              className="report-export-btn"
              onClick={() => void loadReportData()}
            >
              🔄 Обновить список
            </button>
          </div>
          {form530PatientId ? (
            <MedicalForm530n
              patientId={form530PatientId}
              onPatientSelect={setForm530PatientId}
              patientOptions={allPatientsForForm}
            />
          ) : (
            <p className="report-empty">Выберите пациента для формы 530н</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorReportsView;
