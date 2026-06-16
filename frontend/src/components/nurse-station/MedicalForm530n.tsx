import React, { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Form530n, Form530nObservationRow, Patient } from '../../types';
import TruncateText from '../common/TruncateText';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  getPrescriptionStatusLabel,
  getProcedureStatusLabel,
  formatMoscowDate,
  formatMoscowTime,
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

  const setPeriodDays = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    setDateFrom(toInputDate(from));
    setDateTo(toInputDate(to));
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

  const tableColSpan = manualMode ? 10 : 9;
  const selectedPatient = patients.find((pt) => pt.id === activePatientId);

  if (!activePatientId) {
    return (
      <div className="medical-form-530n">
        <h2>Форма 530/н</h2>
        <div className="no-patient-message">
          <p>Выберите пациента для формирования листа наблюдений</p>
          {patients.length > 0 && (
            <select
              className="f530-patient-select"
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id) handlePatientChange(id);
              }}
            >
              <option value="" disabled>
                — Выберите пациента —
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
    <div className="medical-form-530n">
      <div className="f530-header">
        <div>
          <h2>Форма 530/н</h2>
          <p className="f530-subtitle">
            {form?.form_title || 'Лист учёта температуры и других показателей'}
          </p>
        </div>
        <div className="f530-toolbar">
          <select
            className="f530-patient-select"
            value={activePatientId}
            onChange={(e) => handlePatientChange(Number(e.target.value))}
          >
            {patients.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="f530-filters">
        <label>
          С
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          По
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="button" className="f530-btn secondary" onClick={() => setPeriodDays(7)}>
          7 дней
        </button>
        <button type="button" className="f530-btn secondary" onClick={() => setPeriodDays(14)}>
          14 дней
        </button>
        <button
          type="button"
          className="f530-btn primary"
          onClick={() => void loadForm()}
          disabled={loading}
          title="Загрузить наблюдения, активные назначения и процедуры за выбранный период"
        >
          {loading ? 'Загрузка…' : 'Обновить за период'}
        </button>
        <button
          type="button"
          className={`f530-btn secondary ${manualMode ? 'active' : ''}`}
          onClick={enableManualMode}
        >
          Ручной ввод
        </button>
        {manualMode && (
          <>
            <button type="button" className="f530-btn secondary" onClick={addRow}>
              + Строка
            </button>
            <button
              type="button"
              className="f530-btn primary"
              onClick={() => void saveManualRows()}
              disabled={saving}
            >
              {saving ? 'Сохранение…' : 'Сохранить записи'}
            </button>
          </>
        )}
        <button
          type="button"
          className="f530-btn print"
          onClick={() => void handlePrint()}
          disabled={loading || !form}
        >
          Печать
        </button>
      </div>

      <p className="f530-filters-hint">
        «Обновить за период» подтягивает из системы записи наблюдений, активные назначения и
        выполненные процедуры за даты «С» — «По». Ручной ввод добавляет или правит строки листа.
      </p>

      {error && <div className="f530-error">{error}</div>}

      {loading && (
        <div className="f530-loading">
          <LoadingSpinner size="medium" />
        </div>
      )}

      {(form || manualMode) && !loading && (
        <div className="form-preview f530-preview" id="form-530n-print-area">
          <div className="f530-patient-card">
            <div className="f530-patient-grid">
              <div>
                <span className="label">Пациент</span>
                <strong>{p?.full_name ?? selectedPatient?.full_name ?? '—'}</strong>
              </div>
              <div>
                <span className="label">Возраст / пол</span>
                <strong>
                  {p?.age ?? '—'} / {p?.gender ?? selectedPatient?.gender ?? '—'}
                </strong>
              </div>
              <div>
                <span className="label">№ истории</span>
                <strong>{p?.medical_record_number || selectedPatient?.medical_record_number || '—'}</strong>
              </div>
              <div>
                <span className="label">Палата / койка</span>
                <strong>
                  {p?.room_number || '—'} / {p?.bed_number || '—'}
                </strong>
              </div>
              <div>
                <span className="label">Отделение</span>
                <strong>{p?.department_name || selectedPatient?.department_name || '—'}</strong>
              </div>
              <div>
                <span className="label">Период</span>
                <strong>
                  {form
                    ? `${formatDate(form.period_from)} — ${formatDate(form.period_to)}`
                    : `${dateFrom || '—'} — ${dateTo || '—'}`}
                </strong>
              </div>
            </div>
            <div className="f530-meta">
              {form ? (
                <>
                  Записей наблюдений: <strong>{form.observations_count}</strong>
                  {' · '}
                  Сформировано: {formatMoscowDate(form.generated_at)}{' '}
                  {formatMoscowTime(form.generated_at)}
                </>
              ) : (
                <span className="f530-muted">
                  Нажмите «Обновить за период» или заполните строки вручную и сохраните.
                </span>
              )}
              {manualMode && <span className="f530-manual-badge">Режим ручного ввода</span>}
            </div>
          </div>

          <div className="f530-table-wrap">
            <table className="f530-table">
              <thead>
                <tr>
                  {manualMode && <th className="f530-col-actions" />}
                  <th>Дата</th>
                  <th>Время</th>
                  <th>t°</th>
                  <th>Пульс</th>
                  <th>АД</th>
                  <th>Дых.</th>
                  <th>SpO₂</th>
                  <th>Вес</th>
                  <th>Жалобы / осмотр</th>
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
                        <td>
                          <input
                            type="date"
                            className="f530-cell-input"
                            value={row.record_date}
                            onChange={(e) => updateRow(row.localId, 'record_date', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="f530-cell-input narrow"
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
                            onChange={(e) => updateRow(row.localId, 'respiration_rate', e.target.value)}
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
                        <td className="f530-notes-edit">
                          <input
                            className="f530-cell-input"
                            value={row.complaints}
                            placeholder="Жалобы"
                            onChange={(e) => updateRow(row.localId, 'complaints', e.target.value)}
                          />
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
                        <td>{formatDate(row.record_date)}</td>
                        <td>{row.record_time || '—'}</td>
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
                          <TruncateText
                            text={[row.complaints, row.examination].filter(Boolean).join(' · ') || '—'}
                          />
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {form && (
          <div className="f530-side-sections">
            <section className="f530-side-block">
              <h3>Активные назначения ({form.prescriptions.length})</h3>
              {form.prescriptions.length === 0 ? (
                <p className="f530-muted">Нет активных назначений</p>
              ) : (
                <div className="f530-cards">
                  {form.prescriptions.map((rx) => (
                    <div key={rx.id} className="f530-assignment-card">
                      <div className="f530-assignment-head">
                        <span className="f530-tag">{prescTypeLabel(rx.prescription_type)}</span>
                        <span className={`f530-assignment-status status-${rx.status.toLowerCase()}`}>
                          {rx.status === 'ACTIVE' ? 'Активно' : rx.status}
                        </span>
                      </div>
                      <div className="f530-assignment-name">{rx.name}</div>
                      {rx.frequency && (
                        <div className="f530-assignment-meta">Частота: {rx.frequency}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="f530-side-block">
              <h3>Процедуры за период ({form.procedures.length})</h3>
              {form.procedures.length === 0 ? (
                <p className="f530-muted">Нет процедур</p>
              ) : (
                <div className="f530-cards">
                  {form.procedures.map((pr) => (
                    <div key={pr.id} className="f530-assignment-card">
                      <div className="f530-assignment-head">
                        <span className="f530-tag">Выполнение</span>
                        <span className={`f530-assignment-status status-${(pr.status || '').toLowerCase()}`}>
                          {getProcedureStatusLabel(pr.status)}
                        </span>
                      </div>
                      <div className="f530-assignment-name">{pr.name}</div>
                      {pr.scheduled_time && (
                        <div className="f530-assignment-meta">
                          {formatMoscowDate(pr.scheduled_time)}{' '}
                          {formatMoscowTime(pr.scheduled_time)}
                        </div>
                      )}
                      {pr.notes && (
                        <div className="f530-assignment-notes">
                          <TruncateText text={pr.notes} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicalForm530n;
