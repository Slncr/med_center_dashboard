// src/components/nurse-station/AppointmentsView.tsx
import React from 'react';
import './AppointmentsView.css';

interface AppointmentsViewProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({ patientId, onPatientSelect }) => {
  return (
    <div className="appointments-view">
      <h2>Назначения</h2>
      <p>Просмотр и управление назначениями пациентов</p>
      {patientId ? (
        <div className="appointments-content">
          <p>Назначения для пациента ID: {patientId}</p>
          <p>Интерфейс назначений будет здесь</p>
        </div>
      ) : (
        <p>Пожалуйста, выберите пациента для просмотра назначений</p>
      )}
    </div>
  );
};

export default AppointmentsView;