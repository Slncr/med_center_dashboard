import React, { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Form530n, Patient } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import './MedicalForm530n.css';

interface MedicalForm530nProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
}

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('ru-RU');
  } catch {
    return iso;
  }
};

const toInputDate = (d: Date): string => d.toISOString().split('T')[0];

const MedicalForm530n: React.FC<MedicalForm530nProps> = ({ patientId, onPatientSelect }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [localPatientId, setLocalPatientId] = useState<number | null>(patientId);
  const [form, setForm] = useState<Form530n | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const activePatientId = localPatientId ?? patientId;

  useEffect(() => {
    setLocalPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    apiService.getPatients().then(setPatients).catch(() => setPatients([]));
  }, []);

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
      if (!dateFrom) setDateFrom(data.period_from);
      if (!dateTo) setDateTo(data.period_to);
    } catch (err) {
      setForm(null);
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
    }
  }, [activePatientId, loadForm]);

  const handlePatientChange = (id: number) => {
    setLocalPatientId(id);
    onPatientSelect(id);
    setDateFrom('');
    setDateTo('');
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
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
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
        <button type="button" className="f530-btn primary" onClick={() => void loadForm()} disabled={loading}>
          {loading ? 'Формирование…' : 'Сформировать'}
        </button>
        <button
          type="button"
          className="f530-btn print"
          onClick={() => void handlePrint()}
          disabled={loading || !form}
        >
          Печать
        </button>
      </div>

      {error && <div className="f530-error">{error}</div>}

      {loading && (
        <div className="f530-loading">
          <LoadingSpinner size="medium" />
        </div>
      )}

      {form && !loading && (
        <div className="form-preview f530-preview" id="form-530n-print-area">
          <div className="f530-patient-card">
            <div className="f530-patient-grid">
              <div>
                <span className="label">Пациент</span>
                <strong>{p?.full_name}</strong>
              </div>
              <div>
                <span className="label">Возраст / пол</span>
                <strong>
                  {p?.age ?? '—'} / {p?.gender ?? '—'}
                </strong>
              </div>
              <div>
                <span className="label">№ истории</span>
                <strong>{p?.medical_record_number || '—'}</strong>
              </div>
              <div>
                <span className="label">Палата / койка</span>
                <strong>
                  {p?.room_number || '—'} / {p?.bed_number || '—'}
                </strong>
              </div>
              <div>
                <span className="label">Отделение</span>
                <strong>{p?.department_name || '—'}</strong>
              </div>
              <div>
                <span className="label">Период</span>
                <strong>
                  {formatDate(form.period_from)} — {formatDate(form.period_to)}
                </strong>
              </div>
            </div>
            <div className="f530-meta">
              Записей наблюдений: <strong>{form.observations_count}</strong>
              {' · '}
              Сформировано: {formatDate(form.generated_at)}{' '}
              {new Date(form.generated_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="f530-table-wrap">
            <table className="f530-table">
              <thead>
                <tr>
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
                {form.observations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="f530-empty">
                      Нет наблюдений за период. Добавьте данные на вкладке «Наблюдения».
                    </td>
                  </tr>
                ) : (
                  form.observations.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.record_date)}</td>
                      <td>{row.record_time || '—'}</td>
                      <td>{row.temperature ?? '—'}</td>
                      <td>{row.pulse ?? '—'}</td>
                      <td>{row.blood_pressure ?? '—'}</td>
                      <td>{row.respiration_rate ?? '—'}</td>
                      <td>{row.spO2 ?? '—'}</td>
                      <td>{row.weight ?? '—'}</td>
                      <td className="f530-notes">
                        {row.complaints || row.examination || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="f530-side-sections">
            <section>
              <h3>Активные назначения</h3>
              {form.prescriptions.length === 0 ? (
                <p className="f530-muted">Нет активных назначений</p>
              ) : (
                <ul>
                  {form.prescriptions.map((rx) => (
                    <li key={rx.id}>
                      {rx.name}
                      <span className="f530-tag">{rx.prescription_type}</span>
                      {rx.frequency && <em> — {rx.frequency}</em>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3>Процедуры за период</h3>
              {form.procedures.length === 0 ? (
                <p className="f530-muted">Нет процедур</p>
              ) : (
                <ul>
                  {form.procedures.map((pr) => (
                    <li key={pr.id}>
                      {pr.name} — {pr.status}
                      {pr.scheduled_time && (
                        <em> ({formatDate(pr.scheduled_time)})</em>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalForm530n;
