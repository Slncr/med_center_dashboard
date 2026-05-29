import React, { useState } from 'react';
import type { PatientBraceletStatus } from '../../types/braceletAlerts';
import {
  alertLevelForMetric,
  displayMetrics,
} from '../../utils/braceletVitals';
import VitalMetricBadge from './VitalMetricBadge';
import PatientVitalThresholdsForm from './PatientVitalThresholdsForm';
import './PatientBraceletCard.css';

interface PatientBraceletCardProps {
  patient: PatientBraceletStatus;
  onThresholdsSaved?: () => void;
}

const PatientBraceletCard: React.FC<PatientBraceletCardProps> = ({ patient, onThresholdsSaved }) => {
  const [showThresholds, setShowThresholds] = useState(false);
  const metricRows = displayMetrics(patient.metrics);
  const hasAlerts = patient.alerts.length > 0;
  const worstLevel = patient.alerts.some((a) => a.level === 'critical')
    ? 'critical'
    : patient.alerts.some((a) => a.level === 'warning')
      ? 'warning'
      : 'normal';

  return (
    <article
      className={`patient-bracelet-card ${hasAlerts ? `patient-bracelet-card--${worstLevel}` : ''}`}
    >
      <header className="patient-bracelet-card__header">
        <div>
          <h3>
            {patient.patient_name}
            {patient.has_custom_thresholds && (
              <span className="patient-bracelet-card__custom-badge" title="Персональные пороги">
                свои пороги
              </span>
            )}
          </h3>
          <p className="patient-bracelet-card__location">
            {patient.room_number ? `Палата ${patient.room_number}` : 'Палата —'}
            {patient.bed_number ? ` · Койка ${patient.bed_number}` : ''}
          </p>
        </div>
        <span
          className={`patient-bracelet-card__online ${
            patient.online === true
              ? 'is-online'
              : patient.online === false
                ? 'is-offline'
                : 'is-unknown'
          }`}
        >
          {patient.online === true
            ? 'Онлайн'
            : patient.online === false
              ? 'Нет сигнала'
              : patient.ble_mac
                ? 'Нет данных'
                : 'Без MAC'}
        </span>
      </header>

      {!patient.ble_mac && (
        <p className="patient-bracelet-card__hint">Укажите MAC браслета в карточке пациента</p>
      )}

      <div className="patient-bracelet-card__metrics">
        {metricRows.length > 0 ? (
          metricRows.map((row) => (
            <VitalMetricBadge
              key={row.canonical}
              label={row.label}
              value={row.value}
              level={alertLevelForMetric(patient.alerts, row.canonical)}
            />
          ))
        ) : (
          <p className="patient-bracelet-card__hint">Нет показаний с браслета</p>
        )}
      </div>

      {patient.alerts.length > 0 && (
        <ul className="patient-bracelet-card__alerts">
          {patient.alerts.map((alert) => (
            <li key={`${alert.metric}-${alert.level}`} className={`alert-item--${alert.level}`}>
              {alert.message}
            </li>
          ))}
        </ul>
      )}

      <div className="patient-bracelet-card__thresholds">
        <button
          type="button"
          className="patient-bracelet-card__thresholds-btn"
          onClick={() => setShowThresholds((v) => !v)}
        >
          {showThresholds ? 'Скрыть пороги' : '⚙ Настроить пороги'}
        </button>
        {showThresholds && (
          <PatientVitalThresholdsForm
            patientId={patient.patient_id}
            patientName={patient.patient_name}
            compact
            onSaved={() => {
              onThresholdsSaved?.();
            }}
          />
        )}
      </div>
    </article>
  );
};

export default PatientBraceletCard;
