import React from 'react';
import './WelcomeMessage.css';

interface WelcomeMessageProps {
  patientName: string;
  patientId?: number;
  message?: string;
  onClose?: () => void;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  patientName,
  patientId,
  message = 'Добро пожаловать в медицинский центр!',
  onClose
}) => {
  return (
    <div className="welcome-message">
      <div className="welcome-header">
        <h3>✅ Пациент успешно выбран</h3>
        {onClose && (
          <button className="close-button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        )}
      </div>
      
      <div className="welcome-content">
        <div className="patient-details">
          <div className="patient-name-large">{patientName}</div>
          {patientId && (
            <div className="patient-id-large">ID пациента: {patientId}</div>
          )}
        </div>
        
        <div className="welcome-text">
          <p className="greeting">{message}</p>
          <p className="instructions">
            Информация передана медсестре. Ожидайте дальнейших указаний.
          </p>
        </div>
        
        <div className="next-steps">
          <h4>Что будет дальше:</h4>
          <ul>
            <li>📋 Медсестра внесет данные наблюдений</li>
            <li>💊 Врач назначит необходимые процедуры</li>
            <li>📄 Будет заполнена медицинская документация</li>
            <li>🔔 Вы получите уведомление о готовности</li>
          </ul>
        </div>
        
        <div className="status-info">
          <div className="status-item">
            <span className="status-icon">⏳</span>
            <span className="status-text">Ожидание медсестры</span>
          </div>
          <div className="status-item">
            <span className="status-icon">📱</span>
            <span className="status-text">Уведомление отправлено</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;