import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Appointment, Procedure, ProcedureStatus } from '../../types';
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
  const [expandedProcedureId, setExpandedProcedureId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [appointmentsRes, proceduresRes] = await Promise.all([
        apiService.getAppointments(patientId),
        apiService.getProcedures(patientId)
      ]);
      
      setAppointments(Array.isArray(appointmentsRes) ? appointmentsRes : appointmentsRes.data || []);
      setProcedures(Array.isArray(proceduresRes) ? proceduresRes : proceduresRes.data || []);
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcedureStatusChange = async (procedureId: number, newStatus: ProcedureStatus) => {
    try {
      await apiService.updateProcedureStatus(procedureId, newStatus);
      setProcedures(prev => prev.map(proc => 
        proc.id === procedureId ? { ...proc, status: newStatus } : proc
      ));
      
      if (onProcedureUpdate) {
        onProcedureUpdate();
      }
    } catch (err) {
      console.error('Error updating procedure:', err);
      alert('Ошибка обновления статуса процедуры');
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '—';
    }
  };

  const getProcedureStatusText = (status: string): string => {
    switch (status) {
      case 'SCHEDULED': return 'Запланировано';
      case 'IN_PROGRESS': return 'В процессе';
      case 'COMPLETED': return '✅ Выполнено';
      case 'CANCELLED': return '❌ Отменено';
      default: return status;
    }
  };

  const getProcedureStatusClass = (status: string): string => {
    switch (status) {
      case 'SCHEDULED': return 'ad-status-scheduled';
      case 'IN_PROGRESS': return 'ad-status-in-progress';
      case 'COMPLETED': return 'ad-status-completed';
      case 'CANCELLED': return 'ad-status-cancelled';
      default: return '';
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchData();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="ad-container">
        <div className="ad-loading">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ad-container">
        <div className="ad-error">
          <div className="ad-error-icon">⚠️</div>
          <div>{error}</div>
          <button className="ad-btn ad-btn-primary" onClick={fetchData}>Повторить</button>
        </div>
      </div>
    );
  }

  const pendingProcedures = procedures.filter(p => 
    p.status === 'SCHEDULED' || p.status === 'IN_PROGRES'
  );
  const completedProcedures = procedures.filter(p => p.status === 'COMPLETED');

  return (
    <div className={`ad-container ${compact ? 'ad-compact' : ''}`}>
      <div className="ad-header">
        <div className="ad-tabs">
          <button
            className={`ad-tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📅 Назначения ({appointments.length})
          </button>
          <button
            className={`ad-tab ${activeTab === 'procedures' ? 'active' : ''}`}
            onClick={() => setActiveTab('procedures')}
          >
            💉 Процедуры ({pendingProcedures.length})
          </button>
        </div>
        
        <button className="ad-refresh-btn" onClick={fetchData} title="Обновить">
          🔄
        </button>
      </div>

      <div className="ad-content">
        {activeTab === 'appointments' ? (
          <div className="ad-list">
            {appointments.length === 0 ? (
              <div className="ad-empty">
                <div>📅</div>
                <p>Нет назначений</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <div key={appointment.id} className="ad-appointment-item">
                  <div className="ad-item-header">
                    <div className="ad-item-title">{appointment.title}</div>
                    <div className={`ad-item-status ${getProcedureStatusClass(appointment.status)}`}>
                      {getProcedureStatusText(appointment.status)}
                    </div>
                  </div>
                  
                  <div className="ad-item-body">
                    {appointment.description && (
                      <div className="ad-item-desc">{appointment.description}</div>
                    )}
                    
                    <div className="ad-item-meta">
                      <div>📅 {formatDateTime(appointment.appointment_date)}</div>
                      {appointment.appointment_time && (
                        <div>⏰ {formatDateTime(appointment.appointment_time)}</div>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <div className="ad-item-notes" title={appointment.notes}>
                        📝 {appointment.notes.length > 60 ? `${appointment.notes.substring(0, 60)}...` : appointment.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="ad-list">
            {pendingProcedures.length === 0 ? (
              <div className="ad-empty">
                <div>✅</div>
                <p>Нет активных процедур</p>
              </div>
            ) : (
              pendingProcedures.map((procedure) => (
                <React.Fragment key={procedure.id}>
                  <div 
                    className={`ad-procedure-item ${getProcedureStatusClass(procedure.status)} ${expandedProcedureId === procedure.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedProcedureId(prev => prev === procedure.id ? null : procedure.id)}
                  >
                    <div className="ad-item-header">
                      <div className="ad-item-title">{procedure.name}</div>
                      <div className={`ad-item-status ${getProcedureStatusClass(procedure.status)}`}>
                        {getProcedureStatusText(procedure.status)}
                      </div>
                    </div>
                    
                    <div className="ad-item-body">
                      {procedure.description && (
                        <div className="ad-item-desc">
                          {procedure.description.length > 60 
                            ? `${procedure.description.substring(0, 60)}...` 
                            : procedure.description}
                        </div>
                      )}
                      
                      <div className="ad-item-meta">
                        <div>⏰ {formatDateTime(procedure.scheduled_time)}</div>
                        {procedure.dosage && <div>💊 {procedure.dosage}</div>}
                        {procedure.frequency && <div>🔄 {procedure.frequency}</div>}
                      </div>
                    </div>
                    
                    <div className="ad-item-toggle">
                      {expandedProcedureId === procedure.id ? '▴' : '▾'}
                    </div>
                  </div>
                  
                  {expandedProcedureId === procedure.id && (
                    <div className="ad-procedure-detail">
                      <div className="ad-detail-row">
                        <span className="ad-detail-label">Полное описание:</span>
                        <span className="ad-detail-value">{procedure.description || '—'}</span>
                      </div>
                      {procedure.notes && (
                        <div className="ad-detail-row">
                          <span className="ad-detail-label">Примечания:</span>
                          <span className="ad-detail-value">{procedure.notes}</span>
                        </div>
                      )}
                      <div className="ad-detail-row">
                        <span className="ad-detail-label">Статус:</span>
                        <span className={`ad-detail-value ${getProcedureStatusClass(procedure.status)}`}>
                          {getProcedureStatusText(procedure.status)}
                        </span>
                      </div>
                      
                      <div className="ad-procedure-actions">
                        {procedure.status === 'SCHEDULED' && (
                          <>
                            <button 
                              className="ad-btn ad-btn-warning" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcedureStatusChange(procedure.id!, 'IN_PROGRES');
                              }}
                            >
                              Начать
                            </button>
                            <button 
                              className="ad-btn ad-btn-success" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcedureStatusChange(procedure.id!, 'COMPLETED');
                              }}
                            >
                              Завершить
                            </button>
                          </>
                        )}
                        
                        {procedure.status === 'IN_PROGRES' && (
                          <button 
                            className="ad-btn ad-btn-success" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcedureStatusChange(procedure.id!, 'COMPLETED');
                            }}
                          >
                            Завершить процедуру
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))
            )}
            
            {pendingProcedures.length > 0 && (
              <div className="ad-summary">
                <div className="ad-summary-item">
                  <span>Запланировано:</span>
                  <span>{procedures.filter(p => p.status === 'SCHEDULED').length}</span>
                </div>
                <div className="ad-summary-item">
                  <span>В процессе:</span>
                  <span>{procedures.filter(p => p.status === 'IN_PROGRES').length}</span>
                </div>
                <div className="ad-summary-item">
                  <span>Выполнено:</span>
                  <span>{procedures.filter(p => p.status === 'COMPLETED').length}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsDisplay;