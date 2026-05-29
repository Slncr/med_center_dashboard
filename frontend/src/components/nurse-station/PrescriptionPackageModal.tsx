import React from 'react';
import { PrescriptionPackage } from '../../types';
import TruncateText from '../common/TruncateText';
import {
  formatPackageTitle,
  packageStatusLabel,
  prescriptionProgress,
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
      return '💉 Процедура';
    case 'MEASUREMENT':
      return '📊 Измерение';
    default:
      return type;
  }
};

const itemStatusLabel = (status: string) => {
  const label = getPrescriptionStatusLabel(status);
  if (label === 'Активно') return 'Не выполнено';
  return label;
};

const PrescriptionPackageModal: React.FC<PrescriptionPackageModalProps> = ({ pkg, onClose }) => {
  const workItems = pkg.prescriptions.filter(
    (p) => p.prescription_type === 'PROCEDURE' || p.prescription_type === 'MEASUREMENT',
  );

  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pkg-modal-header">
          <div>
            <h2>{formatPackageTitle(pkg)}</h2>
            <span className={`pkg-modal-status pkg-status-${pkg.status.toLowerCase()}`}>
              {packageStatusLabel(pkg)}
            </span>
          </div>
          <button type="button" className="pkg-modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {pkg.general_notes && (
          <div className="pkg-modal-general-notes">
            <strong>Общие примечания</strong>
            <p>{pkg.general_notes}</p>
          </div>
        )}

        <div className="pkg-modal-table-wrap">
          <table className="pkg-modal-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th>Название</th>
                <th>Частота</th>
                <th>Выполнено</th>
                <th>Примечание</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((p) => (
                <tr key={p.id} className={`pkg-row-status-${p.status.toLowerCase()}`}>
                  <td>{typeLabel(p.prescription_type)}</td>
                  <td className="pkg-cell-name">{p.name}</td>
                  <td>{p.frequency || '—'}</td>
                  <td className="pkg-cell-progress">{prescriptionProgress(p)}</td>
                  <td className="pkg-cell-notes">
                    <TruncateText text={p.notes || '—'} />
                  </td>
                  <td>
                    <span className={`pkg-item-status pkg-item-${p.status.toLowerCase()}`}>
                      {itemStatusLabel(p.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default PrescriptionPackageModal;
