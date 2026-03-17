import React, { useState, useEffect } from 'react';
import './NotificationToast.css';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

let notificationId = 0;

const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [removing, setRemoving] = useState<string[]>([]);

  const showNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `${notificationId++}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
      setRemoving(prev => [...prev, id]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setRemoving(prev => prev.filter(nid => nid !== id));
      }, 400); // время анимации
    }, 555000);
  };

  useEffect(() => {
    (window as any).showNotification = showNotification;
    return () => {
      delete (window as any).showNotification;
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="nt-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`nt-toast nt-toast-${notification.type} ${removing.includes(notification.id) ? 'slide-out' : 'show'}`}
          onClick={() => {
            setRemoving(prev => [...prev, notification.id]);
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
              setRemoving(prev => prev.filter(nid => nid !== notification.id));
            }, 400);
          }}
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
          </div>
          <button 
            className="nt-close"
            onClick={(e) => {
              e.stopPropagation();
              setRemoving(prev => [...prev, notification.id]);
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                setRemoving(prev => prev.filter(nid => nid !== notification.id));
              }, 400);
            }}
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