import { User } from "./user";

// Разделите ApiResponse на два разных интерфейса
export interface BaseApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
  error?: string | string[];
  statusCode?: number;
  timestamp?: string;
}

// Для аутентификации, где возвращается пользователь
export interface AuthApiResponse<T = any> extends BaseApiResponse<T> {
  user?: User; // Делаем опциональным
}

// Оставьте старый интерфейс для обратной совместимости (deprecated)
export interface ApiResponse<T = any> extends BaseApiResponse<T> {
  // Этот интерфейс больше не расширяет User
  id?: number;
  username?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiError {
  detail: string | string[];
  status_code: number;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  database: boolean;
  redis: boolean;
}

export interface OneCResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  operation?: string;
}

export interface PrintResponse {
  success: boolean;
  file_url?: string;
  file_content?: string; // base64 encoded PDF
  message?: string;
  timestamp: string;
}

export interface SyncStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  total: number;
  processed: number;
  last_sync: string;
  next_sync: string;
}