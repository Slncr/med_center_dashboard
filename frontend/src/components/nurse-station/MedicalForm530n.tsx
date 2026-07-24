import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/api';
import { Form530n, Form530nObservationRow, Form530nProcedureItem, Patient } from '../../types';
import TruncateText from '../common/TruncateText';
import LoadingSpinner from '../common/LoadingSpinner';
import { useKeyboardAwareScroll } from '../../hooks/useKeyboardAwareScroll';
import {
  formatMoscowDate,
} from '../../utils/formatters';
import './MedicalForm530n.css';

interface MedicalForm530nProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
  patientOptions?: Patient[];
}

type EditableRow = {
  id?: number;
  localId: string;
  record_date: string;
  record_time: string;
  temperature: string;
  pulse: string;
  bp_sys: string;
  bp_dia: string;
  respiration_rate: string;
  spO2: string;
  weight: string;
  complaints: string;
  examination: string;
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('ru-RU');
  } catch {
    return iso;
  }
};

const toInputDate = (d: Date): string => d.toISOString().split('T')[0];

let localRowIdSeq = 0;

/** ID строки без crypto.randomUUID (нет в части Opera / Яндекс.Браузера и без HTTPS). */
const newLocalRowId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* secure context / старый движок */
    }
  }
  localRowIdSeq += 1;
  return `f530-row-${Date.now()}-${localRowIdSeq}`;
};

const emptyRow = (recordDate: string): EditableRow => ({
  localId: newLocalRowId(),
  record_date: recordDate,
  record_time: '',
  temperature: '',
  pulse: '',
  bp_sys: '',
  bp_dia: '',
  respiration_rate: '',
  spO2: '',
  weight: '',
  complaints: '',
  examination: '',
});

const rowFromObservation = (row: Form530nObservationRow): EditableRow => {
  const [bp_sys, bp_dia] = (row.blood_pressure || '').split('/');
  return {
    id: row.id,
    localId: String(row.id),
    record_date: row.record_date,
    record_time: row.record_time || '',
    temperature: row.temperature != null ? String(row.temperature) : '',
    pulse: row.pulse != null ? String(row.pulse) : '',
    bp_sys: bp_sys?.trim() || '',
    bp_dia: bp_dia?.trim() || '',
    respiration_rate: row.respiration_rate != null ? String(row.respiration_rate) : '',
    spO2: row.spO2 != null ? String(row.spO2) : '',
    weight: row.weight != null ? String(row.weight) : '',
    complaints: row.complaints || '',
    examination: row.examination || '',
  };
};

const prescTypeLabel = (type: string) => {
  switch (type) {
    case 'PROCEDURE':
      return 'Процедура';
    case 'MEASUREMENT':
      return 'Измерение';
    default:
      return type;
  }
};

const formatGender = (gender?: string | null): string => {
  if (!gender) return '—';
  const value = gender.trim().toLowerCase();
  if (value.startsWith('ж') || value === 'f' || value === 'female') return 'Ж';
  if (value.startsWith('м') || value === 'm' || value === 'male') return 'М';
  return gender;
};

const formatBirthDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU');
  } catch {
    return iso;
  }
};

const formatObservationDate = (recordDate: string, recordTime?: string): string => {
  try {
    const shortDate = new Date(recordDate).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    if (recordTime) {
      return `${recordTime} ${shortDate}`;
    }
    return shortDate;
  } catch {
    return recordDate;
  }
};

const countProceduresForName = (
  name: string,
  procedures: Form530nProcedureItem[],
): { done: number; total: number } => {
  const related = procedures.filter((item) => item.name === name);
  const total = related.length;
  const done = related.filter((item) => String(item.status).toUpperCase() === 'COMPLETED').length;
  return { done, total };
};

const MedicalForm530n: React.FC<MedicalForm530nProps> = ({
  patientId,
  onPatientSelect,
  patientOptions,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [localPatientId, setLocalPatientId] = useState<number | null>(patientId);
  const [form, setForm] = useState<Form530n | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [editableRows, setEditableRows] = useState<EditableRow[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  useKeyboardAwareScroll(pageRef, manualMode);

  const activePatientId = localPatientId ?? patientId;

  useEffect(() => {
    setLocalPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    if (patientOptions) {
      setPatients(patientOptions);
      return;
    }
    apiService.getPatients().then(setPatients).catch(() => setPatients([]));
  }, [patientOptions]);

  const loadForm = useCallback(async () => {
    if (!activePatientId) return;
    setLoading(true);
    setError(null);
    try {
      const params: { date_from?: string; date_to?: string } = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await apiService.getForm530n(activePatientId, params);
      setForm(data);
      setEditableRows(data.observations.map(rowFromObservation));
      if (!dateFrom) setDateFrom(data.period_from);
      if (!dateTo) setDateTo(data.period_to);
    } catch (err) {
      setForm(null);
      setEditableRows([]);
      setError(err instanceof Error ? err.message : 'Не удалось сформировать форму');
    } finally {
      setLoading(false);
    }
  }, [activePatientId, dateFrom, dateTo]);

  useEffect(() => {
    if (activePatientId) {
      void loadForm();
    } else {
      setForm(null);
      setEditableRows([]);
    }
  }, [activePatientId, loadForm]);

  const handlePatientChange = (id: number) => {
    setLocalPatientId(id);
    onPatientSelect(id);
    setDateFrom('');
    setDateTo('');
    setManualMode(false);
  };

  const handlePrint = async () => {
    if (!activePatientId) return;
    try {
      const params: { date_from?: string; date_to?: string } = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const blob = await apiService.printForm530n(activePatientId, params);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        setError('Разрешите всплывающие окна для печати');
        return;
      }
      win.onload = () => {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      };
    } catch {
      setError('Ошибка подготовки печати');
    }
  };


  const updateRow = (localId: string, field: keyof EditableRow, value: string) => {
    setEditableRows((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, [field]: value } : r)),
    );
  };

  const addRow = () => {
    const defaultDate = dateTo || dateFrom || toInputDate(new Date());
    setEditableRows((prev) => [...prev, emptyRow(defaultDate)]);
    setManualMode(true);
  };

  const removeRow = (localId: string) => {
    setEditableRows((prev) => prev.filter((r) => r.localId !== localId));
  };

  const saveManualRows = async () => {
    if (!activePatientId) return;
    setSaving(true);
    setError(null);
    try {
      for (const row of editableRows) {
        const payload = {
          patient_id: activePatientId,
          record_date: row.record_date,
          temperature: row.temperature ? parseFloat(row.temperature) : null,
          pulse: row.pulse ? parseInt(row.pulse, 10) : null,
          blood_pressure_systolic: row.bp_sys ? parseInt(row.bp_sys, 10) : null,
          blood_pressure_diastolic: row.bp_dia ? parseInt(row.bp_dia, 10) : null,
          respiration_rate: row.respiration_rate ? parseInt(row.respiration_rate, 10) : null,
          spO2: row.spO2 ? parseInt(row.spO2, 10) : null,
          weight: row.weight ? parseFloat(row.weight) : null,
          complaints: row.complaints || null,
          examination: row.examination || null,
        };

        if (row.id) {
          await apiService.updateObservation(row.id, payload);
        } else if (
          row.temperature ||
          row.pulse ||
          row.bp_sys ||
          row.bp_dia ||
          row.complaints ||
          row.examination
        ) {
          await apiService.createObservation(payload);
        }
      }
      await loadForm();
      setManualMode(false);
    } catch {
      setError('Ошибка сохранения записей');
    } finally {
      setSaving(false);
    }
  };

  const enableManualMode = () => {
    setError(null);
    setManualMode(true);
    if (editableRows.length === 0) {
      const defaultDate = dateTo || dateFrom || toInputDate(new Date());
      setEditableRows([emptyRow(defaultDate)]);
    }
  };

  const tableColSpan = manualMode ? 10 : 8;
  const selectedPatient = patients.find((pt) => pt.id === activePatientId);
  const periodLabel = form
    ? `${formatDate(form.period_from)} — ${formatDate(form.period_to)}`
    : `${dateFrom ? formatDate(dateFrom) : '—'} — ${dateTo ? formatDate(dateTo) : '—'}`;

  const completedProcedures =
    form?.procedures.filter((pr) => String(pr.status).toUpperCase() === 'COMPLETED') ?? [];

  if (!activePatientId) {
    return (
      <div className="f530-page" ref={pageRef}>
        <div className="f530-title-row">
          <h2 className="f530-title">Форма 530н</h2>
        </div>
        <div className="f530-panel f530-panel-empty">
          <p>Выберите пациента для формирования листа наблюдений</p>
          {patients.length > 0 && (
            <select
              className="f530-select"
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id) handlePatientChange(id);
              }}
            >
              <option value="" disabled>
                Выберите пациента
              </option>
              {patients.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  const p = form?.patient;

  return (
    <div className="f530-page" ref={pageRef}>
      <div className="f530-title-row no-print">
        <h2 className="f530-title">Форма 530н</h2>
        <button
          type="button"
          className="f530-btn f530-btn-outline f530-btn-icon"
          onClick={() => void loadForm()}
          disabled={loading}
        >
          <span className="f530-btn-icon-mark" aria-hidden>↻</span>
          Обновить
        </button>
      </div>

      {error && <div className="f530-error no-print">{error}</div>}

      {loading && (
        <div className="f530-loading no-print">
          <LoadingSpinner size="medium" />
        </div>
      )}

      <div className="f530-panel" id="form-530n-print-area">
        <div className="f530-controls no-print">
          <div className="f530-controls-fields">
            <label className="f530-field">
              <span className="f530-field-label">Пациент</span>
              <select
                className="f530-select"
                value={activePatientId}
                onChange={(e) => handlePatientChange(Number(e.target.value))}
              >
                {patients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="f530-field f530-field-period">
              <span className="f530-field-label">Период</span>
              <span className="f530-period-range">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="f530-period-sep">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </span>
            </label>
          </div>

          <div className="f530-actions">
            <button
              type="button"
              className="f530-btn f530-btn-outline"
              onClick={() => void loadForm()}
              disabled={loading}
            >
              {loading ? 'Загрузка…' : 'Обновить за период'}
            </button>
            <button
              type="button"
              className={`f530-btn f530-btn-outline ${manualMode ? 'is-active' : ''}`}
              onClick={enableManualMode}
            >
              Ручной ввод
            </button>
            <button type="button" className="f530-btn f530-btn-outline" onClick={addRow}>
              + Строка
            </button>
            <button
              type="button"
              className="f530-btn f530-btn-outline"
              onClick={() => void handlePrint()}
              disabled={loading || !form}
            >
              Печать
            </button>
            <button
              type="button"
              className="f530-btn f530-btn-primary"
              onClick={() => void saveManualRows()}
              disabled={saving || !manualMode}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>

        {manualMode && (
          <div className="f530-manual-badge no-print">Режим ручного ввода</div>
        )}

        {(form || manualMode) && !loading && (
          <>
            <div className="f530-table-wrap">
              <table className="f530-table f530-table-patient">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Дата рождения</th>
                    <th>Пол</th>
                    <th>История</th>
                    <th>Палата</th>
                    <th>Койка</th>
                    <th>Период</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{p?.full_name ?? selectedPatient?.full_name ?? '—'}</td>
                    <td>{formatBirthDate(p?.birth_date ?? selectedPatient?.birth_date)}</td>
                    <td>{formatGender(p?.gender ?? selectedPatient?.gender)}</td>
                    <td>
                      {p?.medical_record_number
                        ? `№${p.medical_record_number}`
                        : selectedPatient?.medical_record_number
                          ? `№${selectedPatient.medical_record_number}`
                          : '—'}
                    </td>
                    <td>{p?.room_number ?? '—'}</td>
                    <td>{p?.bed_number ?? '—'}</td>
                    <td>{periodLabel}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="f530-table-wrap">
              <table className="f530-table f530-table-vitals">
                <thead>
                  <tr>
                    {manualMode && <th className="f530-col-actions" />}
                    <th>Дата</th>
                    <th>t°</th>
                    <th>Пульс</th>
                    <th>Арт. давление</th>
                    <th>Дыхание</th>
                    <th>SpO₂</th>
                    <th>Вес</th>
                    <th>Жалобы</th>
                    <th>Осмотр</th>
                  </tr>
                </thead>
                <tbody>
                  {editableRows.length === 0 && !manualMode ? (
                    <tr>
                      <td colSpan={tableColSpan} className="f530-empty">
                        Нет наблюдений за период. Нажмите «Ручной ввод» для заполнения листа.
                      </td>
                    </tr>
                  ) : editableRows.length === 0 && manualMode ? (
                    <tr>
                      <td colSpan={tableColSpan} className="f530-empty">
                        Нажмите «+ Строка», чтобы добавить запись.
                      </td>
                    </tr>
                  ) : (
                    editableRows.map((row) =>
                      manualMode ? (
                        <tr key={row.localId}>
                          <td className="f530-col-actions">
                            <button
                              type="button"
                              className="f530-row-remove"
                              onClick={() => removeRow(row.localId)}
                              title="Удалить строку"
                            >
                              ✕
                            </button>
                          </td>
                          <td className="f530-date-edit">
                            <input
                              type="date"
                              className="f530-cell-input"
                              value={row.record_date}
                              onChange={(e) => updateRow(row.localId, 'record_date', e.target.value)}
                            />
                            <input
                              className="f530-cell-input f530-cell-input-time"
                              value={row.record_time}
                              placeholder="08:00"
                              onChange={(e) => updateRow(row.localId, 'record_time', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input narrow"
                              value={row.temperature}
                              onChange={(e) => updateRow(row.localId, 'temperature', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input narrow"
                              value={row.pulse}
                              onChange={(e) => updateRow(row.localId, 'pulse', e.target.value)}
                            />
                          </td>
                          <td className="f530-bp-cell">
                            <input
                              className="f530-cell-input narrow"
                              value={row.bp_sys}
                              placeholder="120"
                              onChange={(e) => updateRow(row.localId, 'bp_sys', e.target.value)}
                            />
                            <span>/</span>
                            <input
                              className="f530-cell-input narrow"
                              value={row.bp_dia}
                              placeholder="80"
                              onChange={(e) => updateRow(row.localId, 'bp_dia', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input narrow"
                              value={row.respiration_rate}
                              onChange={(e) =>
                                updateRow(row.localId, 'respiration_rate', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input narrow"
                              value={row.spO2}
                              onChange={(e) => updateRow(row.localId, 'spO2', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input narrow"
                              value={row.weight}
                              onChange={(e) => updateRow(row.localId, 'weight', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input"
                              value={row.complaints}
                              placeholder="Жалобы"
                              onChange={(e) => updateRow(row.localId, 'complaints', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="f530-cell-input"
                              value={row.examination}
                              placeholder="Осмотр"
                              onChange={(e) => updateRow(row.localId, 'examination', e.target.value)}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.localId}>
                          <td>{formatObservationDate(row.record_date, row.record_time)}</td>
                          <td>{row.temperature || '—'}</td>
                          <td>{row.pulse || '—'}</td>
                          <td>
                            {row.bp_sys || row.bp_dia
                              ? `${row.bp_sys || '—'}/${row.bp_dia || '—'}`
                              : '—'}
                          </td>
                          <td>{row.respiration_rate || '—'}</td>
                          <td>{row.spO2 || '—'}</td>
                          <td>{row.weight || '—'}</td>
                          <td className="f530-notes">
                            <TruncateText text={row.complaints || '—'} />
                          </td>
                          <td className="f530-notes">
                            <TruncateText text={row.examination || '—'} />
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>

            {form && (
              <div className="f530-assignments">
                <section className="f530-assignments-col">
                  <h3 className="f530-assignments-title">Активные назначения</h3>
                  {form.prescriptions.length === 0 ? (
                    <p className="f530-muted">Нет активных назначений</p>
                  ) : (
                    <div className="f530-cards">
                      {form.prescriptions.map((rx) => {
                        const stats = countProceduresForName(rx.name, form.procedures);
                        const hasProgress = stats.total > 0;
                        return (
                          <article key={rx.id} className="f530-rx-card">
                            <div className="f530-rx-card-body">
                              <div className="f530-rx-name">{rx.name}</div>
                              {rx.frequency && (
                                <div className="f530-rx-meta">{rx.frequency}</div>
                              )}
                              <div className="f530-rx-meta">{periodLabel.split(' — ')[1] ?? periodLabel}</div>
                            </div>
                            <div
                              className={`f530-rx-status ${hasProgress && stats.done >= stats.total ? 'is-complete' : 'is-partial'}`}
                            >
                              <span className="f530-rx-dot" aria-hidden />
                              {hasProgress
                                ? `${stats.done}/${stats.total} выполнено`
                                : prescTypeLabel(rx.prescription_type)}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="f530-assignments-col">
                  <h3 className="f530-assignments-title">Выполненные назначения</h3>
                  {completedProcedures.length === 0 ? (
                    <p className="f530-muted">Нет выполненных назначений за период</p>
                  ) : (
                    <div className="f530-cards">
                      {completedProcedures.map((pr) => {
                        const stats = countProceduresForName(pr.name, form.procedures);
                        const total = stats.total || 1;
                        return (
                          <article key={pr.id} className="f530-rx-card">
                            <div className="f530-rx-card-body">
                              <div className="f530-rx-name">{pr.name}</div>
                              {pr.scheduled_time && (
                                <div className="f530-rx-meta">
                                  {formatMoscowDate(pr.scheduled_time)}
                                </div>
                              )}
                            </div>
                            <div className="f530-rx-status is-complete">
                              <span className="f530-rx-dot" aria-hidden />
                              {stats.total > 0
                                ? `${total}/${total} выполнено`
                                : 'Выполнено'}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {!form && !manualMode && !loading && (
          <p className="f530-muted f530-empty-hint">
            Выберите период и нажмите «Обновить за период» для загрузки данных.
          </p>
        )}
      </div>
    </div>
  );
};

export default MedicalForm530n;
