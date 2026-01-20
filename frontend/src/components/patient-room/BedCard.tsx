import React from 'react';
import './BedCard.css';
import { Bed } from '../../types/patient';

interface BedCardProps {
  bed: Bed;
  roomNumber: string;
  onSelect: (bedId: number, patientName: string) => void;
  disabled?: boolean;
}

const BedCard: React.FC<BedCardProps> = ({ bed, roomNumber, onSelect, disabled }) => {
  return (
    <div className="bed-card">
      <div className="bed-info">
        <div className="bed-header">
          <span className="bed-number">🛏️ Койка #{bed.number}</span>
          <span className="room-number">Палата {roomNumber}</span>
        </div>
        <div className="patient-info">
          <div className="patient-name">{bed.patient}</div>
          {bed.patient_id && (
            <div className="patient-id">ID: {bed.patient_id}</div>
          )}
        </div>
      </div>
      <button
        className="select-button"
        onClick={() => onSelect(bed.id, bed.patient)}
        disabled={disabled}
      >
        Выбрать пациента
      </button>
    </div>
  );
};

export default BedCard;