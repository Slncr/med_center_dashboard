import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { apiService } from '../services/api';
import { User, LoginRequest, AuthState } from '../types';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<User | null>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const login = useCallback(async (credentials: LoginRequest): Promise<User | null> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const tokenResponse = await apiService.login(credentials);
      const token = tokenResponse.access_token;
      const user = await apiService.getCurrentUser();

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_profile', JSON.stringify(user));

      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (err) {
      apiService.logout();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Ошибка аутентификации',
      });
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
      error: null,
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
        error: null,
      });
      return;
    }

    apiService.setToken(token);
    setAuthState((prev) => ({ ...prev, token, isLoading: true }));

    try {
      const freshUser = await apiService.getCurrentUser();
      localStorage.setItem('user_profile', JSON.stringify(freshUser));
      setAuthState({
        user: freshUser,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      apiService.logout();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
