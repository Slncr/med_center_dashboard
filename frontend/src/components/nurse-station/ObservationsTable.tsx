// src/components/nurse-station/ObservationsTable.tsx
import React from 'react';
import './ObservationsTable.css';

interface ObservationsTableProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
}

const ObservationsTable: React.FC<ObservationsTableProps> = ({ patientId, onPatientSelect }) => {
  return (
    <div className="observations-table">
      <h2>Наблюдения за пациентами</h2>
      <p>Выберите пациента для просмотра и добавления наблюдений</p>
      {patientId ? (
        <div className="selected-patient">
          <p>Выбран пациент ID: {patientId}</p>
          <p>Интерфейс наблюдений будет здесь</p>
        </div>
      ) : (
        <p>Пожалуйста, выберите пациента из списка</p>
      )}
    </div>
  );
};

export default ObservationsTable;