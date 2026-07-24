import React from 'react';
import { Patient } from '../../types';
import { activePatientFlagStatuses } from '../../utils/patientFlags';
import './BedPatientFlags.css';

interface BedPatientFlagsProps {
  patient?: Patient | null;
  compact?: boolean;
}

const BedPatientFlags: React.FC<BedPatientFlagsProps> = ({ patient, compact = false }) => {
  const statuses = activePatientFlagStatuses(patient);

  if (!patient || statuses.length === 0) {
    return null;
  }

  return (
    <ul className={`bed-patient-flags ${compact ? 'bed-patient-flags--compact' : ''}`}>
      {statuses.map((item) => (
        <li key={item.key} className={`bed-patient-flag bed-patient-flag--${item.color}`}>
          <span className="bed-patient-flag-swatch" aria-hidden />
          <span className="bed-patient-flag-label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
};

export default BedPatientFlags;
