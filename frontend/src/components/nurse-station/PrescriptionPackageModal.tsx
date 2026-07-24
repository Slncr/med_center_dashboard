import React from 'react';
import { Prescription, PrescriptionPackage } from '../../types';
import TruncateText from '../common/TruncateText';
import {
  formatPackageTitle,
  packageStatusLabel,
} from '../../utils/prescriptionPackages';
import { getPrescriptionStatusLabel } from '../../utils/formatters';
import './PrescriptionPackageModal.css';

interface PrescriptionPackageModalProps {
  pkg: PrescriptionPackage;
  onClose: () => void;
}

const typeLabel = (type: string) => {
  switch (type) {
    case 'PROCEDURE':
      return 'Процедура';
    case 'MEASUREMENT':
      return 'Измерение';
    default:
      return type;
  }
};

const itemStatusLabel = (status: string) => {
  const label = getPrescriptionStatusLabel(status);
  if (label === 'Активно') return 'Не выполнено';
  return label;
};

function formatRxDate(prescription: Prescription): string {
  const raw = prescription.start_date || prescription.created_at;
  try {
    return new Date(raw).toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
}

function getProgressMeta(
  prescription: Prescription,
): { label: string; tone: 'partial' | 'complete' | 'cancelled' } {
  if (prescription.status === 'CANCELLED') {
    return { label: 'Отменено', tone: 'cancelled' };
  }
  const req = prescription.executions_required ?? 1;
  const done = prescription.executions_done ?? 0;
  const isComplete = prescription.status === 'COMPLETED' || done >= req;
  return {
    label: `${isComplete ? req : done}/${req} выполнено`,
    tone: isComplete ? 'complete' : 'partial',
  };
}

const PrescriptionPackageModal: React.FC<PrescriptionPackageModalProps> = ({ pkg, onClose }) => {
  const workItems = pkg.prescriptions.filter(
    (p) => p.prescription_type === 'PROCEDURE' || p.prescription_type === 'MEASUREMENT',
  );

  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pkg-modal__header">
          <div className="pkg-modal__header-main">
            <p className="pkg-modal__eyebrow">Пакет назначений</p>
            <h2 className="pkg-modal__title">{formatPackageTitle(pkg)}</h2>
            <span className={`pkg-modal__status pkg-modal__status--${pkg.status.toLowerCase()}`}>
              {packageStatusLabel(pkg)}
            </span>
          </div>
          <button type="button" className="pkg-modal__close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className="pkg-modal__body">
          {pkg.general_notes && (
            <div className="pkg-modal__notes">
              <span className="pkg-modal__notes-label">Общие примечания</span>
              <p>{pkg.general_notes}</p>
            </div>
          )}

          {workItems.length === 0 ? (
            <div className="pkg-modal__empty">В пакете нет процедур и измерений</div>
          ) : (
            <div className="pkg-modal__list">
              {workItems.map((p) => {
                const progress = getProgressMeta(p);
                const isComplete = p.status === 'COMPLETED';
                const isCancelled = p.status === 'CANCELLED';

                return (
                  <article
                    key={p.id}
                    className={`pkg-modal__row ${isCancelled ? 'is-cancelled' : ''}`}
                  >
                    <div
                      className={`pkg-modal__check ${isComplete ? 'is-complete' : ''}`}
                      aria-hidden="true"
                    >
                      <span className="pkg-modal__check-ui" />
                    </div>

                    <div className="pkg-modal__row-body">
                      <div className="pkg-modal__row-top">
                        <span className={`pkg-modal__type pkg-modal__type--${p.prescription_type.toLowerCase()}`}>
                          {typeLabel(p.prescription_type)}
                        </span>
                        <span className={`pkg-modal__item-status pkg-modal__item-status--${p.status.toLowerCase()}`}>
                          {itemStatusLabel(p.status)}
                        </span>
                      </div>
                      <div className="pkg-modal__name">{p.name}</div>
                      {p.frequency && <div className="pkg-modal__freq">{p.frequency}</div>}
                      <div className="pkg-modal__date">от {formatRxDate(p)}</div>
                      {p.notes && (
                        <div className="pkg-modal__item-notes">
                          <TruncateText text={p.notes} />
                        </div>
                      )}
                    </div>

                    <div className={`pkg-modal__progress pkg-modal__progress--${progress.tone}`}>
                      <span className="pkg-modal__dot" />
                      {progress.label}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="pkg-modal__footer">
          <button type="button" className="pkg-modal__footer-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPackageModal;
