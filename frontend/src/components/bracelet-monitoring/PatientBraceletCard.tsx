import React, { useState } from 'react';
import type { PatientBraceletStatus } from '../../types/braceletAlerts';
import {
  alertLevelForMetric,
  displayMetrics,
} from '../../utils/braceletVitals';
import { apiService } from '../../services/api';
import VitalMetricBadge from './VitalMetricBadge';
import PatientVitalThresholdsModal from './PatientVitalThresholdsModal';
import './PatientBraceletCard.css';

interface PatientBraceletCardProps {
  patient: PatientBraceletStatus;
  onThresholdsSaved?: () => void;
  onChanged?: () => void;
}

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

      {patient.ble_mac ? (
        <p className="patient-bracelet-card__mac">
          Браслет: <code>{patient.ble_mac}</code>
        </p>
      ) : (
        <p className="patient-bracelet-card__hint">
          Браслет не привязан — выберите в блоке «Свободные браслеты» выше
        </p>
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

      <div className="patient-bracelet-card__actions">
        <button
          type="button"
          className="patient-bracelet-card__thresholds-btn"
          onClick={() => setThresholdsModalOpen(true)}
        >
          ⚙ Настроить пороги
        </button>
        {patient.ble_mac && (
          <button
            type="button"
            className="patient-bracelet-card__unassign-btn"
            disabled={unassigning}
            onClick={() => {
              if (
                !window.confirm(
                  `Отвязать браслет ${patient.ble_mac} от ${patient.patient_name}?`,
                )
              ) {
                return;
              }
              setUnassigning(true);
              apiService
                .unassignBracelet(patient.patient_id)
                .then(() => refresh())
                .catch((err) => {
                  window.alert(
                    err instanceof Error ? err.message : 'Не удалось отвязать браслет',
                  );
                })
                .finally(() => setUnassigning(false));
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
