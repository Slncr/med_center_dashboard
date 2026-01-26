export type UserRole = 'nurse' | 'doctor' | 'admin';

export interface User {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface TokenData {
  username: string;
  user_id: number;
  role: UserRole;
  exp: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}