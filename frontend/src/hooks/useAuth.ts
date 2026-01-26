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

  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiService.login(credentials);
      setAuthState({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return true;
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Ошибка аутентификации'
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await apiService.logout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  const checkAuth = useCallback(async (): Promise<void> => {
    const token = apiService.getToken();
    if (!token) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await apiService.getCurrentUser();
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (err) {
      apiService.setToken(null);
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