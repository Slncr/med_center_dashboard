import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Appointment, Procedure, ProcedureStatus } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import './AppointmentsDisplay.css';

interface AppointmentsDisplayProps {
  patientId: number;
  onProcedureUpdate?: () => void;
  compact?: boolean;
}

const AppointmentsDisplay: React.FC<AppointmentsDisplayProps> = ({
  patientId,
  onProcedureUpdate,
  compact = false
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appointments' | 'procedures'>('appointments');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [appointmentsRes, proceduresRes] = await Promise.all([
        apiService.getAppointments(patientId),
        apiService.getProcedures(patientId)
      ]);
      
      // Обработка ответа appointments
      if (appointmentsRes.success && appointmentsRes.data) {
        setAppointments(appointmentsRes.data);
      } else if (appointmentsRes.error) {
        console.error('Appointments error:', appointmentsRes.error);
        // Не выбрасываем ошибку, просто логируем
      }
      
      // Обработка ответа procedures
      if (proceduresRes.success && proceduresRes.data) {
        setProcedures(proceduresRes.data);
      } else if (proceduresRes.error) {
        console.error('Procedures error:', proceduresRes.error);
        // Не выбрасываем ошибку, просто логируем
      }
      
      // Показываем ошибку только если оба запроса неуспешны
      if (!appointmentsRes.success && !proceduresRes.success) {
        setError('Ошибка загрузки данных');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleProcedureStatusChange = async (procedureId: number, newStatus: ProcedureStatus) => {
    try {
      const response = await apiService.updateProcedureStatus(procedureId, newStatus);
      setProcedures(prev => prev.map(proc => 
        proc.id === procedureId ? { ...proc, ...response, status: newStatus } : proc
      ));
      
      if (onProcedureUpdate) {
        onProcedureUpdate();
      }
    } catch (err) {
      console.error('Error updating procedure:', err);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        weekday: 'short'
      });
    } catch {
      return '--.--.----';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled': return 'status-scheduled';
      case 'in_progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'scheduled': return 'Запланировано';
      case 'in_progress': return 'В процессе';
      case 'completed': return 'Выполнено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchData();
      
      // Автообновление каждые 30 секунд
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [patientId]);

  if (loading && !refreshing) {
    return (
      <div className="appointments-loading">
        <LoadingSpinner size="medium" />
        <p>Загрузка назначений...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="appointments-error" variant="bordered">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error}</div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleRefresh}
            isLoading={refreshing}
          >
            Повторить
          </Button>
        </div>
      </Card>
    );
  }

  const pendingProcedures = procedures.filter(p => 
    p.status === 'scheduled' || p.status === 'in_progress'
  );
  const completedProcedures = procedures.filter(p => p.status === 'completed');

  return (
    <div className={`appointments-display ${compact ? 'compact' : ''}`}>
      <div className="appointments-header">
        <div className="header-tabs">
          <button
            className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📅 Назначения ({appointments.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'procedures' ? 'active' : ''}`}
            onClick={() => setActiveTab('procedures')}
          >
            💉 Процедуры ({pendingProcedures.length})
          </button>
        </div>
        
        <Button
          variant="light"
          size="sm"
          onClick={handleRefresh}
          isLoading={refreshing}
          icon="🔄"
        >
          Обновить
        </Button>
      </div>

      <div className="appointments-content">
        {activeTab === 'appointments' ? (
          <div className="appointments-list">
            {appointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>Нет назначений</p>
                <p className="empty-subtitle">Все назначения будут отображаться здесь</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <Card key={appointment.id} className="appointment-card" hoverable>
                  <div className="appointment-header">
                    <h4 className="appointment-title">{appointment.title}</h4>
                    <span className={`appointment-status ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                  
                  <div className="appointment-body">
                    {appointment.description && (
                      <p className="appointment-description">{appointment.description}</p>
                    )}
                    
                    <div className="appointment-details">
                      <div className="detail-item">
                        <span className="detail-label">Дата:</span>
                        <span className="detail-value">{formatDate(appointment.appointment_date)}</span>
                      </div>
                      {appointment.appointment_time && (
                        <div className="detail-item">
                          <span className="detail-label">Время:</span>
                          <span className="detail-value">{formatTime(appointment.appointment_time)}</span>
                        </div>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <div className="appointment-notes">
                        <strong>Примечания врача:</strong> {appointment.notes}
                      </div>
                    )}
                  </div>
                  
                  {!appointment.is_completed && (
                    <div className="appointment-footer">
                      <Button
                        variant="success"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          // Логика завершения назначения
                          console.log('Complete appointment:', appointment.id);
                        }}
                      >
                        Отметить как выполненное
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="procedures-section">
            <div className="procedures-tabs">
              <div className="procedures-subtabs">
                <button className="subtab-button active">Текущие ({pendingProcedures.length})</button>
                <button className="subtab-button">Выполненные ({completedProcedures.length})</button>
              </div>
            </div>
            
            <div className="procedures-list">
              {pendingProcedures.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p>Нет активных процедур</p>
                  <p className="empty-subtitle">Все процедуры выполнены</p>
                </div>
              ) : (
                pendingProcedures.map((procedure) => (
                  <Card key={procedure.id} className="procedure-card" hoverable>
                    <div className="procedure-header">
                      <h4 className="procedure-name">{procedure.name}</h4>
                      <span className={`procedure-status ${getStatusColor(procedure.status)}`}>
                        {getStatusText(procedure.status)}
                      </span>
                    </div>
                    
                    <div className="procedure-body">
                      {procedure.description && (
                        <p className="procedure-description">{procedure.description}</p>
                      )}
                      
                      <div className="procedure-details">
                        <div className="detail-item">
                          <span className="detail-label">Время:</span>
                          <span className="detail-value">{formatTime(procedure.scheduled_time)}</span>
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
                      </div>
                      
                      {procedure.notes && (
                        <div className="procedure-notes">
                          <strong>Примечания:</strong> {procedure.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="procedure-actions">
                      {procedure.status === 'scheduled' && (
                        <>
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleProcedureStatusChange(procedure.id!, 'in_progress')}
                            fullWidth
                          >
                            Начать процедуру
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleProcedureStatusChange(procedure.id!, 'completed')}
                            fullWidth
                          >
                            Завершить
                          </Button>
                        </>
                      )}
                      
                      {procedure.status === 'in_progress' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleProcedureStatusChange(procedure.id!, 'completed')}
                          fullWidth
                        >
                          Завершить процедуру
                        </Button>
                      )}
                    </div>
                    
                    <div className="procedure-time">
                      <span className="time-icon">⏰</span>
                      <span className="time-text">
                        Начало: {formatDate(procedure.scheduled_time)} в {formatTime(procedure.scheduled_time)}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            {pendingProcedures.length > 0 && (
              <div className="procedures-summary">
                <div className="summary-item">
                  <span className="summary-label">Ожидают выполнения:</span>
                  <span className="summary-value">
                    {procedures.filter(p => p.status === 'scheduled').length}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">В процессе:</span>
                  <span className="summary-value">
                    {procedures.filter(p => p.status === 'in_progress').length}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Выполнено:</span>
                  <span className="summary-value">
                    {procedures.filter(p => p.status === 'completed').length}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {activeTab === 'procedures' && pendingProcedures.length > 0 && (
        <div className="procedures-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(completedProcedures.length / procedures.length) * 100}%` 
              }}
            ></div>
          </div>
          <div className="progress-text">
            Выполнено: {completedProcedures.length} из {procedures.length} процедур
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsDisplay;