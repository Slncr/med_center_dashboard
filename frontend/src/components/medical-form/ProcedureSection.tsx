import React, { useState } from 'react';
import { Procedure, ProcedureStatus } from '../../types';
import './ProcedureSection.css';

interface ProcedureSectionProps {
  procedures: Procedure[];
  onAddProcedure: (procedure: Omit<Procedure, 'id'>) => void;
  onUpdateProcedure: (id: number, updates: Partial<Procedure>) => void;
  onDeleteProcedure: (id: number) => void;
  disabled?: boolean;
}

const ProcedureSection: React.FC<ProcedureSectionProps> = ({
  procedures,
  onAddProcedure,
  onUpdateProcedure,
  onDeleteProcedure,
  disabled = false
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [newProcedure, setNewProcedure] = useState<Omit<Procedure, 'id'>>({
    patient_id: 0,
    name: '',
    description: '',
    scheduled_time: new Date().toISOString(),
    status: 'scheduled' as ProcedureStatus,
    dosage: '',
    frequency: '',
    duration: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProcedure.name.trim()) {
      onAddProcedure(newProcedure);
      setNewProcedure({
        patient_id: 0,
        name: '',
        description: '',
        scheduled_time: new Date().toISOString(),
        status: 'scheduled' as ProcedureStatus,
        dosage: '',
        frequency: '',
        duration: ''
      });
      setShowForm(false);
    }
  };

  const handleStatusChange = (procedureId: number, newStatus: ProcedureStatus) => {
    onUpdateProcedure(procedureId, { status: newStatus });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusColor = (status: ProcedureStatus): string => {
    switch (status) {
      case 'SCHEDULED': return 'status-pending';
      case 'IN_PROGRES': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  };

  const getStatusText = (status: ProcedureStatus): string => {
    switch (status) {
      case 'SCHEDULED': return 'Запланировано';
      case 'IN_PROGRES': return 'В процессе';
      case 'COMPLETED': return 'Выполнено';
      case 'CANCELLED': return 'Отменено';
      default: return status;
    }
  };

  return (
    <div className="procedure-section">
      <div className="procedure-header">
        <h3 className="procedure-title">
          💉 Медицинские процедуры ({procedures.length})
        </h3>
        <div className="procedure-actions">
          <button
            type="button"
            className="add-procedure-button"
            onClick={() => setShowForm(!showForm)}
            disabled={disabled}
          >
            {showForm ? 'Отмена' : 'Добавить процедуру'}
          </button>
          <button
            type="button"
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="procedure-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="procedure-name">Название процедуры *</label>
              <input
                id="procedure-name"
                type="text"
                value={newProcedure.name}
                onChange={(e) => setNewProcedure({...newProcedure, name: e.target.value})}
                required
                disabled={disabled}
                placeholder="Например: Измерение температуры"
              />
            </div>

            <div className="form-group">
              <label htmlFor="procedure-time">Время выполнения</label>
              <input
                id="procedure-time"
                type="datetime-local"
                value={newProcedure.scheduled_time.slice(0, 16)}
                onChange={(e) => setNewProcedure({...newProcedure, scheduled_time: e.target.value})}
                disabled={disabled}
              />
            </div>

            <div className="form-group">
              <label htmlFor="procedure-status">Статус</label>
              <select
                id="procedure-status"
                value={newProcedure.status}
                onChange={(e) => setNewProcedure({...newProcedure, status: e.target.value as ProcedureStatus})}
                disabled={disabled}
              >
                <option value="scheduled">Запланировано</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Выполнено</option>
                <option value="cancelled">Отменено</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="procedure-dosage">Дозировка</label>
              <input
                id="procedure-dosage"
                type="text"
                value={newProcedure.dosage}
                onChange={(e) => setNewProcedure({...newProcedure, dosage: e.target.value})}
                disabled={disabled}
                placeholder="Например: 500мг"
              />
            </div>

            <div className="form-group">
              <label htmlFor="procedure-frequency">Периодичность</label>
              <input
                id="procedure-frequency"
                type="text"
                value={newProcedure.frequency}
                onChange={(e) => setNewProcedure({...newProcedure, frequency: e.target.value})}
                disabled={disabled}
                placeholder="Например: 3 раза в день"
              />
            </div>

            <div className="form-group">
              <label htmlFor="procedure-duration">Длительность</label>
              <input
                id="procedure-duration"
                type="text"
                value={newProcedure.duration}
                onChange={(e) => setNewProcedure({...newProcedure, duration: e.target.value})}
                disabled={disabled}
                placeholder="Например: 7 дней"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="procedure-description">Описание</label>
            <textarea
              id="procedure-description"
              value={newProcedure.description}
              onChange={(e) => setNewProcedure({...newProcedure, description: e.target.value})}
              disabled={disabled}
              placeholder="Подробное описание процедуры..."
              rows={3}
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="save-button" disabled={disabled}>
              Сохранить процедуру
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => setShowForm(false)}
              disabled={disabled}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {isExpanded && (
        <div className="procedure-list">
          {procedures.length === 0 ? (
            <div className="no-procedures">
              <p>Нет назначенных процедур</p>
              <button
                type="button"
                className="add-first-button"
                onClick={() => setShowForm(true)}
                disabled={disabled}
              >
                Добавить первую процедуру
              </button>
            </div>
          ) : (
            procedures.map((procedure) => (
              <div key={procedure.id} className="procedure-item">
                <div className="procedure-item-header">
                  <h4 className="procedure-name">{procedure.name}</h4>
                  <span className={`procedure-status ${getStatusColor(procedure.status)}`}>
                    {getStatusText(procedure.status)}
                  </span>
                </div>

                {procedure.description && (
                  <div className="procedure-description">
                    {procedure.description}
                  </div>
                )}

                <div className="procedure-details">
                  <div className="detail-item">
                    <span className="detail-label">Время:</span>
                    <span className="detail-value">
                      {formatDate(procedure.scheduled_time)} {formatTime(procedure.scheduled_time)}
                    </span>
                  </div>
                  {procedure.dosage && (
                    <div className="detail-item">
                      <span className="detail-label">Дозировка:</span>
                      <span className="detail-value">{procedure.dosage}</span>
                    </div>
                  )}
                  {procedure.frequency && (
                    <div className="detail-item">
                      <span className="detail-label">Периодичность:</span>
                      <span className="detail-value">{procedure.frequency}</span>
                    </div>
                  )}
                  {procedure.duration && (
                    <div className="detail-item">
                      <span className="detail-label">Длительность:</span>
                      <span className="detail-value">{procedure.duration}</span>
                    </div>
                  )}
                </div>

                {procedure.notes && (
                  <div className="procedure-notes">
                    <strong>Примечания:</strong> {procedure.notes}
                  </div>
                )}

                <div className="procedure-item-actions">
                  {procedure.status === 'SCHEDULED' && (
                    <>
                      <button
                        type="button"
                        className="action-button start-button"
                        onClick={() => handleStatusChange(procedure.id!, 'IN_PROGRES')}
                        disabled={disabled}
                      >
                        Начать
                      </button>
                      <button
                        type="button"
                        className="action-button complete-button"
                        onClick={() => handleStatusChange(procedure.id!, 'COMPLETED')}
                        disabled={disabled}
                      >
                        Завершить
                      </button>
                    </>
                  )}
                  {procedure.status === 'IN_PROGRES' && (
                    <button
                      type="button"
                      className="action-button complete-button"
                      onClick={() => handleStatusChange(procedure.id!, 'COMPLETED')}
                      disabled={disabled}
                    >
                      Завершить
                    </button>
                  )}
                  {procedure.status !== 'CANCELLED' && procedure.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      className="action-button cancel-button"
                      onClick={() => handleStatusChange(procedure.id!, 'CANCELLED')}
                      disabled={disabled}
                    >
                      Отменить
                    </button>
                  )}
                  <button
                    type="button"
                    className="action-button delete-button"
                    onClick={() => procedure.id && onDeleteProcedure(procedure.id)}
                    disabled={disabled}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProcedureSection;