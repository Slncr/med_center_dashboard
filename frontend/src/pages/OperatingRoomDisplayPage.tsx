import React from 'react';
import { useOperatingRoomStatus } from '../hooks/useOperatingRoomStatus';
import { OR_STATUS_BY_ID } from '../utils/operatingRoomStatus';
import './OperatingRoomDisplayPage.css';

const OperatingRoomDisplayPage: React.FC = () => {
  const { status } = useOperatingRoomStatus();
  const option = OR_STATUS_BY_ID[status];

  return (
    <div
      className="or-display"
      style={{ ['--or-display-color' as string]: option.color }}
    >
      <div className="or-display__badge">Операционная</div>
      <div className="or-display__body">
        <h1 className="or-display__title">{option.displayLabel}</h1>
        <div className="or-display__icon-wrap" aria-hidden>
          <img className="or-display__icon" src={option.icon} alt="" />
        </div>
        <p className="or-display__subtitle">{option.displaySubtitle}</p>
      </div>
    </div>
  );
};

export default OperatingRoomDisplayPage;
