import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../MainLayout';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return;
    }
    
    try {
      // ✅ login возвращает профиль с ролью
      const user = await login({ username, password });
      
      if (user) {
        // ✅ Перенаправление по роли
        switch (user.role.toLowerCase()) {
          case 'nurse':
            navigate('/nurse/appointments');
            break;
          case 'doctor':
            navigate('/doctor/patients');
            break;
          case 'admin':
            navigate('/register');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <MainLayout>
      <div className="lg-container">
        <div className="lg-card">
          <div className="lg-header">
            <div className="lg-logo">🏥</div>
            <h1 className="lg-title">Медицинский центр</h1>
            <p className="lg-subtitle">Система управления пациентами</p>
          </div>

          {error && (
            <div className="lg-error">
              <div className="error-icon">⚠️</div>
              <div className="error-text">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="lg-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">Логин</label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                placeholder="Введите логин"
                className="form-input"
                autoComplete="username"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="form-input"
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
            </div>

            <button 
              type="submit" 
              className="lg-btn"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? 'Вход...' : 'Войти в систему'}
            </button>
          </form>

          <div className="lg-footer">
            <p>© {new Date().getFullYear()} Медицинский центр</p>
            <p className="version">Версия 1.2</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;