// src/components/nurse-station/MedicalForm530n.tsx
import React from 'react';
import './MedicalForm530n.css';

interface MedicalForm530nProps {
  patientId: number | null;
  onPatientSelect: (patientId: number) => void;
}

const MedicalForm530n: React.FC<MedicalForm530nProps> = ({ patientId, onPatientSelect }) => {
  return (
    <div className="medical-form-530n">
      <h2>Форма 530н</h2>
      <p>Заполнение медицинской документации по форме 530н</p>
      {patientId ? (
        <div className="form-content">
          <p>Форма для пациента ID: {patientId}</p>
          <p>Интерфейс формы будет здесь</p>
        </div>
      ) : (
        <p>Пожалуйста, выберите пациента для заполнения формы</p>
      )}
    </div>
  );
};

export default MedicalForm530n;