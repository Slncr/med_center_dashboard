import React, { useState, useEffect, useCallback } from 'react';
import './NotificationToast.css';

export interface NotificationAction {
  label: string;
  patientId?: number;
  onClick?: () => void;
}

export interface NotificationInput {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  groupKey?: string;
  action?: NotificationAction;
}

interface Notification extends NotificationInput {
  id: string;
  timestamp: number;
}

let notificationId = 0;

const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [removing, setRemoving] = useState<string[]>([]);

  const dismiss = useCallback((id: string) => {
    setRemoving((prev) => [...prev, id]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setRemoving((prev) => prev.filter((nid) => nid !== id));
    }, 400);
  }, []);

  const showNotification = useCallback(
    (notification: NotificationInput) => {
      const id = `${notificationId++}`;
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: Date.now(),
      };

      setNotifications((prev) => {
        if (notification.groupKey) {
          const filtered = prev.filter((n) => n.groupKey !== notification.groupKey);
          return [...filtered, newNotification];
        }
        return [...prev, newNotification];
      });

      const duration = notification.duration ?? (notification.action ? 12000 : 5000);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  useEffect(() => {
    (window as Window & { showNotification?: typeof showNotification }).showNotification =
      showNotification;
    return () => {
      delete (window as Window & { showNotification?: typeof showNotification }).showNotification;
    };
  }, [showNotification]);

  const handleAction = (notification: Notification) => {
    if (notification.action?.onClick) {
      notification.action.onClick();
    } else if (notification.action?.patientId != null) {
      const navigate = (
        window as Window & { navigateToPatient?: (patientId: number) => void }
      ).navigateToPatient;
      navigate?.(notification.action.patientId);
    }
    dismiss(notification.id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="nt-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`nt-toast nt-toast-${notification.type} ${
            removing.includes(notification.id) ? 'slide-out' : 'show'
          }`}
        >
          <div className="nt-icon">
            {notification.type === 'success' && '✅'}
            {notification.type === 'error' && '❌'}
            {notification.type === 'info' && 'ℹ️'}
            {notification.type === 'warning' && '⚠️'}
          </div>
          <div className="nt-content">
            <div className="nt-title">{notification.title}</div>
            <div className="nt-message">{notification.message}</div>
            {notification.action && (
              <button
                type="button"
                className="nt-action"
                onClick={() => handleAction(notification)}
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            type="button"
            className="nt-close"
            onClick={() => dismiss(notification.id)}
            aria-label="Закрыть уведомление"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
