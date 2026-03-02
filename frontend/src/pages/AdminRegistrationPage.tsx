import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { User } from '../types';
import './AdminRegistrationPage.css';

interface NewUser {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: 'doctor' | 'nurse';
}

const AdminRegistrationPage: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'doctor'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Пока идёт загрузка — ничего не делаем
    if (isLoading || user === null) return;

    // Проверяем роль (в нижнем регистре, т.к. с бэка приходит 'admin')
    if (user.role.toLowerCase() !== 'admin') {
      alert('Доступ запрещён. Только администратор может регистрировать пользователей.');
      navigate('/dashboard');
      return;
    }

    loadUsers();
  }, [user, isLoading, navigate]);

  const loadUsers = async () => {
    try {
      const data = await apiService.getUsers();
      
      // Фильтруем админов: роли могут приходить в ЛЮБОМ регистре, поэтому приводим к нижнему
      const nonAdminUsers = data.filter(u => 
        u.role?.toString().toLowerCase() !== 'admin'
      );
      
      setUsers(nonAdminUsers);
    } catch (err: any) {
      console.error('Error loading users:', err);
      
      // Логируем детали ошибки для отладки
      if (err.response) {
        console.error('Error response:', err.response.status, err.response.data);
        setError(`Ошибка ${err.response.status}: ${err.response.data.detail || 'Не удалось загрузить список пользователей'}`);
      } else {
        setError('Ошибка загрузки списка пользователей');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUser.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Отправляем роль в ВЕРХНЕМ регистре (как ожидает бэкенд)
      await apiService.registerUser({
        ...newUser,
        role: newUser.role // 'DOCTOR' или 'NURSE' в верхнем регистре
      });
      
      setSuccess(`Пользователь ${newUser.full_name} успешно зарегистрирован как ${newUser.role === 'doctor' ? 'врач' : 'медсестра'}`);
      setNewUser({ username: '', email: '', full_name: '', password: '', role: 'doctor' });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации пользователя');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="reg-container">
        <div className="reg-loading">Загрузка профиля...</div>
      </div>
    );
  }

  // ✅ Если пользователь загружен, но не админ — уже перенаправлено
  if (!user || user.role.toLowerCase() !== 'admin') {
    return (
      <div className="reg-container">
        <div className="reg-loading">Доступ запрещён</div>
      </div>
    );
  }
  
  return (
    <div className="reg-container">
      <div className="reg-header">
        {/* <div className="reg-logo">🏥</div> */}
        <h1 className="reg-title">Регистрация персонала</h1>
        {/* <div className="reg-user-info">
          <span className="reg-user-name">{user?.full_name}</span>
          <span className="reg-user-role">Администратор</span>
          <button onClick={handleLogout} className="reg-logout-btn">Выйти</button>
        </div> */}
      </div>

      <div className="reg-content">
        {/* Форма регистрации */}
        <div className="reg-form-card">
          <h2 className="reg-form-title">Новый пользователь</h2>
          
          {error && (
            <div className="reg-error">
              <div className="error-icon">⚠️</div>
              <div className="error-text">{error}</div>
            </div>
          )}
          
          {success && (
            <div className="reg-success">
              <div className="success-icon">✅</div>
              <div className="success-text">{success}</div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="reg-form">
            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="full_name" className="form-label">ФИО</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={newUser.full_name}
                  onChange={handleInputChange}
                  placeholder="Иванов Иван Иванович"
                  className="ar-form-input"
                  required
                />
              </div>
            </div>

            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="username" className="form-label">Логин</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={newUser.username}
                  onChange={handleInputChange}
                  placeholder="ivanov_i"
                  className="ar-form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  placeholder="ivanov@example.com"
                  className="ar-form-input"
                  required
                />
              </div>
            </div>

            <div className="reg-form-row">
              <div className="form-group">
                <label htmlFor="password" className="form-label">Пароль</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  placeholder="Минимум 6 символов"
                  className="ar-form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="role" className="form-label">Роль</label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="doctor">👨‍⚕️ Врач</option>
                  <option value="nurse">👩‍⚕️ Медсестра</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="reg-btn"
              disabled={loading}
            >
              {loading ? 'Регистрация...' : 'Зарегистрировать'}
            </button>
          </form>
        </div>

        {/* Список пользователей */}
        <div className="reg-users-card">
          <div className="reg-users-header">
            <h2 className="reg-users-title">Зарегистрированный персонал</h2>
            <div className="reg-users-stats">
              <span className="stat-item">
                <span className="stat-label">Врачи:</span>
                <span className="stat-value">
                  {users.filter(u => u.role?.toString().toLowerCase() === 'doctor').length}
                </span>
              </span>
              <span className="stat-item">
                <span className="stat-label">Медсёстры:</span>
                <span className="stat-value">
                  {users.filter(u => u.role?.toString().toLowerCase() === 'nurse').length}
                </span>
              </span>
            </div>
          </div>
          
          <div className="reg-users-list">
            {users.length === 0 ? (
              <div className="reg-empty">
                <div>👥</div>
                <p>Нет зарегистрированных пользователей</p>
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} className="reg-user-item">
                  <div className="user-info">
                    <div className="user-name">{user.full_name}</div>
                    <div className={`user-role role-${user.role?.toString().toLowerCase() || 'unknown'}`}>
                      {user.role?.toString().toLowerCase() === 'doctor' ? '👨‍⚕️ Врач' : 
                       user.role?.toString().toLowerCase() === 'nurse' ? '👩‍⚕️ Медсестра' : 
                       '—'}
                    </div>
                  </div>
                  <div className="user-meta">
                    <span className="user-login">@{user.username}</span>
                    <span className="user-email">{user.email || '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="reg-footer">
        <p>© {new Date().getFullYear()} Медицинский центр • Система управления персоналом</p>
      </div>
    </div>
  );
};

export default AdminRegistrationPage;