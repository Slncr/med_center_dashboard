import React from 'react';
import './BedCard.css';
import { Bed } from '../../types';

interface BedCardProps {
  bed: Bed;
  roomNumber: string;
  onSelect: (bedId: number) => void;
  disabled?: boolean;
}

const BedCard: React.FC<BedCardProps> = ({ bed, roomNumber, onSelect, disabled }) => {
  // Получаем имя пациента - может быть string или Patient объект
  const patientName = typeof bed.patient === 'string' 
    ? bed.patient 
    : bed.patient?.full_name || `Пациент ${bed.id}`;
  
  return (
    <div className="bed-card">
      <div className="bed-info">
        <div className="bed-header">
          <span className="bed-number">🛏️ Койка #{bed.number}</span>
          <span className="room-number">Палата {roomNumber}</span>
        </div>
        <div className="patient-info">
          <div className="patient-name">{patientName}</div>
          {bed.patient?.id && (
            <div className="patient-id">ID: {bed.patient?.id}</div>
          )}
        </div>
      </div>
      <button
        className="select-button"
        onClick={() => onSelect(bed.id)}
        disabled={disabled}
      >
        Выбрать пациента
      </button>
    </div>
  );
};

export default BedCard;