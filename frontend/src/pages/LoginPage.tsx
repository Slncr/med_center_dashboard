import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login({ username, password });
    if (success) {
      navigate('/room');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🏥 Медицинский Центр</h1>
          <h2>Вход в систему</h2>
          <p>Пожалуйста, авторизуйтесь для доступа к системе</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span>Запомнить меня</span>
            </label>
            <a href="/forgot-password" className="forgot-password">
              Забыли пароль?
            </a>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти в систему'}
          </button>

          <div className="login-footer">
            <p>Выберите интерфейс:</p>
            <div className="interface-buttons">
              <button 
                type="button"
                onClick={() => navigate('/room')}
                className="interface-button"
              >
                📱 Планшет у палаты
              </button>
              <button 
                type="button"
                onClick={() => navigate('/nurse')}
                className="interface-button"
              >
                🩺 Станция медсестры
              </button>
              <button 
                type="button"
                onClick={() => navigate('/doctor')}
                className="interface-button"
              >
                👨‍⚕️ Кабинет врача
              </button>
            </div>
          </div>
        </form>

        <div className="demo-credentials">
          <h3>Демо доступ:</h3>
          <div className="credential">
            <strong>Медсестра:</strong> nurse / password123
          </div>
          <div className="credential">
            <strong>Врач:</strong> doctor / password123
          </div>
          <div className="credential">
            <strong>Админ:</strong> admin / password123
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;