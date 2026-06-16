import React from 'react';
import PatientVitalThresholdsForm from './PatientVitalThresholdsForm';
import './PatientVitalThresholdsModal.css';

interface PatientVitalThresholdsModalProps {
  patientId: number;
  patientName: string;
  onClose: () => void;
  onSaved?: () => void;
}

const PatientVitalThresholdsModal: React.FC<PatientVitalThresholdsModalProps> = ({
  patientId,
  patientName,
  onClose,
  onSaved,
}) => {
  const handleSaved = () => {
    onSaved?.();
    onClose();
  };

  return (
    <div className="bracelet-thresholds-modal-overlay" onClick={onClose}>
      <div
        className="bracelet-thresholds-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="bracelet-thresholds-modal-title"
      >
        <header className="bracelet-thresholds-modal__header">
          <div>
            <h2 id="bracelet-thresholds-modal-title">Пороги браслета</h2>
            <p className="bracelet-thresholds-modal__patient">{patientName}</p>
          </div>
          <button
            type="button"
            className="bracelet-thresholds-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </header>

        <div className="bracelet-thresholds-modal__body">
          <PatientVitalThresholdsForm
            patientId={patientId}
            patientName={patientName}
            inModal
            onSaved={handleSaved}
          />
        </div>
      </div>
    </div>
  );
};

export default PatientVitalThresholdsModal;
