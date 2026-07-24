import React, { useMemo, useState } from 'react';
import type { PatientBraceletStatus } from '../../types/braceletAlerts';
import {
  alertLevelForMetric,
  canonicalMetricKey,
  displayMetrics,
  formatMetricValue,
  getMetricLabel,
} from '../../utils/braceletVitals';
import { apiService } from '../../services/api';
import { appAlert, appConfirm } from '../../context/AppDialogContext';
import VitalMetricBadge from './VitalMetricBadge';
import PatientVitalThresholdsModal from './PatientVitalThresholdsModal';
import './PatientBraceletCard.css';

interface PatientBraceletCardProps {
  patient: PatientBraceletStatus;
  onThresholdsSaved?: () => void;
  onChanged?: () => void;
}

const GRID_METRICS = ['pulse', 'press', 'spo2', 'temp', 'sleep', 'stress'] as const;

function formatCardMetricValue(
  canonical: string,
  metrics: Record<string, unknown>,
): string | null {
  if (canonical === 'press') {
    const press = metrics.press ?? metrics.bp;
    if (typeof press === 'string' && press.includes('/')) return press;
    if (press != null && press !== '') return formatMetricValue('press', press);

    const sys =
      metrics.press_sys ?? metrics.systolic ?? metrics.blood_pressure_systolic;
    const dia =
      metrics.press_dia ?? metrics.diastolic ?? metrics.blood_pressure_diastolic;
    if (sys != null && dia != null) {
      return `${Math.round(Number(sys))}/${Math.round(Number(dia))}`;
    }
    return null;
  }

  const rawKey =
    Object.keys(metrics).find((key) => canonicalMetricKey(key) === canonical) ?? canonical;
  const rawValue = metrics[rawKey];
  if (rawValue === null || rawValue === undefined) return null;

  const n = Number(rawValue);
  if (Number.isNaN(n)) return String(rawValue);

  if (canonical === 'temp') return n.toFixed(1);
  if (canonical === 'spo2') return `${Math.round(n)}%`;
  if (canonical === 'pulse' || canonical === 'sleep' || canonical === 'stress') {
    return `${Math.round(n)}`;
  }

  return formatMetricValue(rawKey, rawValue);
}

function metricBattery(metrics: Record<string, unknown>): number | null {
  const raw = metrics.battery;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}

function formatAdmissionDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU');
}

function locationLine(patient: PatientBraceletStatus): string | null {
  const parts: string[] = [];
  if (patient.room_number) parts.push(`Палата ${patient.room_number}`);
  if (patient.bed_number) parts.push(`койка ${patient.bed_number}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

const BatteryIcon: React.FC<{ level: number }> = ({ level }) => (
  <span className="patient-bracelet-card__battery" title={`Батарея ${level}%`}>
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="7" width="18" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="20" y="10" width="2" height="4" rx="0.5" fill="currentColor" />
      <rect
        x="4"
        y="9"
        width={Math.max(2, (14 * level) / 100)}
        height="6"
        rx="1"
        fill="currentColor"
      />
    </svg>
    {level}%
  </span>
);

const PatientBraceletCard: React.FC<PatientBraceletCardProps> = ({
  patient,
  onThresholdsSaved,
  onChanged,
}) => {
  const [thresholdsModalOpen, setThresholdsModalOpen] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const refresh = () => {
    onChanged?.();
    onThresholdsSaved?.();
  };

  const metricRows = displayMetrics(patient.metrics);
  const rowByCanonical = useMemo(
    () => Object.fromEntries(metricRows.map((row) => [row.canonical, row])),
    [metricRows],
  );

  const gridRows = useMemo(
    () =>
      GRID_METRICS.map((canonical) => {
        const value = formatCardMetricValue(canonical, patient.metrics);
        if (value == null) return null;
        return {
          canonical,
          label: rowByCanonical[canonical]?.label ?? getMetricLabel(canonical),
          value,
        };
      }).filter(Boolean) as Array<{ canonical: string; label: string; value: string }>,
    [patient.metrics, rowByCanonical],
  );

  const hrvRow = useMemo(() => {
    const value = formatCardMetricValue('hrv', patient.metrics);
    if (value == null) return null;
    return {
      canonical: 'hrv',
      label: rowByCanonical.hrv?.label ?? getMetricLabel('hrv'),
      value,
    };
  }, [patient.metrics, rowByCanonical.hrv]);

  const battery = metricBattery(patient.metrics);
  const admission = formatAdmissionDate(patient.admission_date);
  const location = locationLine(patient);

  const onlineLabel =
    patient.online === true
      ? 'онлайн'
      : patient.online === false
        ? 'офлайн'
        : patient.ble_mac
          ? 'нет данных'
          : 'без браслета';

  return (
    <article className="patient-bracelet-card">
      <header className="patient-bracelet-card__header">
        <div className="patient-bracelet-card__title-row">
          <h3 className="patient-bracelet-card__name">{patient.patient_name}</h3>
          <span
            className={`patient-bracelet-card__online ${
              patient.online === true
                ? 'is-online'
                : patient.online === false
                  ? 'is-offline'
                  : 'is-unknown'
            }`}
          >
            {onlineLabel}
          </span>
          {patient.has_custom_thresholds && (
            <span className="patient-bracelet-card__custom-badge" title="Персональные пороги">
              свои пороги
            </span>
          )}
        </div>

        <div className="patient-bracelet-card__meta">
          {location && <span>{location}</span>}
          {admission && <span>Поступил: {admission}</span>}
        </div>

        <div className="patient-bracelet-card__device-row">
          {patient.ble_mac ? (
            <span className="patient-bracelet-card__mac">
              Браслет: <span>({patient.ble_mac})</span>
            </span>
          ) : (
            <span className="patient-bracelet-card__meta-muted">Браслет не привязан</span>
          )}
          {battery != null && <BatteryIcon level={battery} />}
        </div>
      </header>

      {gridRows.length > 0 ? (
        <div className="patient-bracelet-card__metrics-grid">
          {gridRows.map((row) => (
            <VitalMetricBadge
              key={row.canonical}
              label={row.label}
              value={row.value}
              level={alertLevelForMetric(patient.alerts, row.canonical)}
              compact
            />
          ))}
          {hrvRow && (
            <div className="patient-bracelet-card__hrv">
              <VitalMetricBadge
                label={hrvRow.label}
                value={hrvRow.value}
                level={alertLevelForMetric(patient.alerts, hrvRow.canonical)}
                compact
              />
            </div>
          )}
        </div>
      ) : (
        <p className="patient-bracelet-card__hint">
          {patient.ble_mac ? 'Нет показаний с браслета' : 'Привяжите браслет в блоке выше'}
        </p>
      )}

      <div className="patient-bracelet-card__actions">
        <button
          type="button"
          className="patient-bracelet-card__action-btn"
          onClick={() => setThresholdsModalOpen(true)}
        >
          Настроить пороги
        </button>
        {patient.ble_mac && (
          <button
            type="button"
            className="patient-bracelet-card__action-btn"
            disabled={unassigning}
            onClick={() => {
              void (async () => {
                if (
                  !(await appConfirm(
                    `Отвязать браслет ${patient.ble_mac} от ${patient.patient_name}?`,
                    { danger: true },
                  ))
                ) {
                  return;
                }
                setUnassigning(true);
                try {
                  await apiService.unassignBracelet(patient.patient_id);
                  refresh();
                } catch (err) {
                  await appAlert(
                    err instanceof Error ? err.message : 'Не удалось отвязать браслет',
                  );
                } finally {
                  setUnassigning(false);
                }
              })();
            }}
          >
            {unassigning ? 'Отвязка…' : 'Отвязать браслет'}
          </button>
        )}
      </div>

      {thresholdsModalOpen && (
        <PatientVitalThresholdsModal
          patientId={patient.patient_id}
          patientName={patient.patient_name}
          onClose={() => setThresholdsModalOpen(false)}
          onSaved={refresh}
        />
      )}
    </article>
  );
};

export default PatientBraceletCard;
