import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Prescription } from '../../types';
import { appAlert, appConfirm } from '../../context/AppDialogContext';
import './PrescriptionsList.css';

interface PrescriptionsListProps {
  patientId: number;
  onPrescriptionCompleted?: () => void;
}

const PrescriptionsList: React.FC<PrescriptionsListProps> = ({ patientId, onPrescriptionCompleted }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadPrescriptions();
    }
  }, [patientId]);

  const loadPrescriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPrescriptions(patientId);
      setPrescriptions(data);
    } catch (err) {
      setError('Ошибка загрузки назначений');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    if (!(await appConfirm('Отметить назначение как выполненное?'))) return;

    try {
      await apiService.executePrescription(id);
      setPrescriptions(prev => prev.filter(p => p.id !== id));
      if (onPrescriptionCompleted) {
        onPrescriptionCompleted();
      }
    } catch (err) {
      await appAlert('Ошибка выполнения назначения');
      console.error(err);
    }
  };

  if (loading) return <div className="prescriptions-list">Загрузка...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (prescriptions.length === 0) return <div className="empty-list">Нет назначений</div>;

  return (
    <div className="prescriptions-list">
      <h3>📋 Назначения пациента</h3>
      <div className="prescriptions-grid">
        {prescriptions.map(p => (
          <div key={p.id} className={`prescription-card status-${p.status}`}>
            <div className="prescription-header">
              <span className={`type-badge type-${p.prescription_type}`}>
                {p.prescription_type === 'PROCEDURE' && '💉'}
                {p.prescription_type === 'MEASUREMENT' && '📊'}
                {p.prescription_type === 'NOTE' && '📝'}
                {p.prescription_type}
              </span>
              <span className={`status-badge ${p.status}`}>
                {p.status === 'ACTIVE' && 'Активно'}
                {p.status === 'COMPLETED' && 'Выполнено'}
                {p.status === 'CANCELLED' && 'Отменено'}
              </span>
            </div>
            
            <div className="prescription-body">
              <h4>{p.name}</h4>
              
              {p.frequency && (
                <div className="prescription-detail">
                  <strong>Частота:</strong> {p.frequency}
                </div>
              )}
              
              {p.dosage && (
                <div className="prescription-detail">
                  <strong>Дозировка:</strong> {p.dosage}
                </div>
              )}
              
              {p.notes && (
                <div className="prescription-detail notes">
                  <strong>Примечания:</strong> {p.notes}
                </div>
              )}
              
              <div className="prescription-meta">
                <small>Создано: {new Date(p.created_at).toLocaleString('ru-RU')}</small>
              </div>
            </div>
            
            {p.status === 'ACTIVE' && (
              <button 
                className="complete-btn"
                onClick={() => handleComplete(p.id)}
              >
                ✅ Выполнено
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionsList;