// src/hooks/useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { User, LoginRequest, AuthState } from '../types';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // ✅ login теперь возвращает профиль пользователя
  const login = useCallback(async (credentials: LoginRequest): Promise<User | null> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Шаг 1: Получаем токен
      const tokenResponse = await apiService.login(credentials);
      const token = tokenResponse.access_token;
      
      // Шаг 2: Получаем профиль пользователя
      const user = await apiService.getCurrentUser();
      
      // Сохраняем в localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_profile', JSON.stringify(user));
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      return user; // ✅ Возвращаем профиль для перенаправления
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Ошибка аутентификации'
      }));
      
      // Очищаем данные при ошибке
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
      
      return null;
    }
  }, []);

  const logout = useCallback((): void => {
    apiService.logout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  const checkAuth = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      return;
    }

    setAuthState(prev => ({ 
      ...prev, 
      token, 
      isLoading: true 
    }));

    try {
      // Пробуем загрузить из кэша
      const cachedUser = localStorage.getItem('user_profile');
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      }
      
      // Асинхронно обновляем профиль с сервера
      const freshUser = await apiService.getCurrentUser();
      localStorage.setItem('user_profile', JSON.stringify(freshUser));
      
      setAuthState(prev => prev.isAuthenticated ? { 
        ...prev, 
        user: freshUser 
      } : prev);
    } catch (err) {
      // При ошибке — сбрасываем только токен
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
      
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    login,
    logout,
    checkAuth
  };
};