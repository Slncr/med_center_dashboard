import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

const AdminHeader: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ Отображаем хедер ТОЛЬКО для админа
  if (!user || user.role.toLowerCase() !== 'admin') {
    return null;
  }

  const navItems = [
    { label: '👩‍⚕️ Медсёстры', path: '/nurse/appointments' },
    { label: '👨‍⚕️ Врачи', path: '/doctor/patients' },
    { label: '🛏️ Палаты', path: '/room' },
    { label: '👥 Пациенты', path: '/doctor/patients' },
    { label: '📋 Назначения', path: '/nurse/appointments' },
    { label: '⚙️ Персонал', path: '/register' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    navigate('/login');
  };

  return (
    <header className="ah-header">
      <div className="ah-container">
        <div className="ah-logo-section" onClick={() => navigate('/register')}>
          <div className="ah-logo">🏥</div>
          <div className="ah-title">
            <h1>Медицинский центр</h1>
            <div className="ah-subtitle">Административная панель</div>
          </div>
        </div>

        <nav className="ah-nav">
          <ul className="ah-nav-list">
            {navItems.map((item) => (
              <li key={item.path} className="ah-nav-item">
                <button
                  className="ah-nav-link"
                  onClick={() => navigate(item.path)}
                  aria-label={item.label}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ah-user-section">
          <div className="ah-user-info">
            <div className="ah-user-name">{user.full_name}</div>
            <div className="ah-user-role">Администратор</div>
          </div>
          <button onClick={handleLogout} className="ah-logout-btn" aria-label="Выйти">
            <span>🚪</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;