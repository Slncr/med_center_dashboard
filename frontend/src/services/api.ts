// src/services/api.ts

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { 
  Patient, 
  Room, 
  PatientSelectResponse, 
  Observation, 
  Procedure, 
  Form530n,
  Appointment,
  User,
  LoginRequest,
  LoginResponse,
  ApiResponse,
  HealthCheckResponse,
  ApiError,
  Prescription
} from '../types';

const API_BASE_URL = '';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Интерцептор для добавления токена
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Интерцептор для обработки ошибок
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('token');
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.api.get<HealthCheckResponse>('/health');
    return response.data;
  }

  // Аутентификация
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/api/v1/auth/login', credentials);
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
    }
    return response.data;
  }
  
  async logout(): Promise<void> {
    this.setToken(null);
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<User>('/api/v1/auth/users/me');
    return response.data;
  }

  // Пациенты
  async getPatients(): Promise<Patient[]> {
    const response = await this.api.get<Patient[]>('/api/v1/patients/');
    return response.data;
  }

  async getPatient(id: number): Promise<Patient> {
    const response = await this.api.get<Patient>(`/api/v1/patients/${id}`);
    return response.data;
  }

  async selectPatient(patientId: number): Promise<PatientSelectResponse> {
    const response = await this.api.post<PatientSelectResponse>(`/api/v1/patients/${patientId}/select`);
    return response.data;
  }

  async getArchivedPatients(): Promise<Patient[]> {
    const response = await this.api.get<Patient[]>('/api/v1/patients/archived');
    return response.data;
  }

  async archivePatient(patientId: number): Promise<Patient> {
    const response = await this.api.patch<Patient>(`/api/v1/patients/${patientId}/archive`);
    return response.data;
  }

  async restorePatient(patientId: number): Promise<Patient> {
    const response = await this.api.patch<Patient>(`/api/v1/patients/${patientId}/restore`);
    return response.data;
  }

  // Палаты
  async getRooms(): Promise<Room[]> {
    const response = await this.api.get<Room[]>('/api/v1/rooms/');
    return response.data;
  }

  async getRoom(id: number): Promise<Room> {
    const response = await this.api.get<Room>(`/api/v1/rooms/${id}`);
    return response.data;
  }

  // Наблюдения
  async getObservations(patientId: number): Promise<Observation[]> {
    const response = await this.api.get<Observation[]>(`/api/v1/medical/observations/${patientId}`);
    return response.data;
  }

  async createObservation(observation: Omit<Observation, 'id' | 'created_at'>): Promise<Observation> {
    const response = await this.api.post<Observation>('/api/v1/medical/observations', observation);
    return response.data;
  }

  async updateObservation(id: number, updates: Partial<Omit<Observation, 'id' | 'created_at' | 'patient_id' | 'record_date'>>): Promise<Observation> {
    const response = await this.api.put<Observation>(`/api/v1/medical/observations/${id}`, updates);
    return response.data;
  }

  async deleteObservation(id: number): Promise<void> {
    await this.api.delete(`/api/v1/medical/observations/${id}`);
  }

  // Процедуры
  async getProcedures(patientId: number): Promise<ApiResponse<Procedure[]>> {
    try {
      const response = await this.api.get<Procedure[]>(`/api/v1/medical/procedures/${patientId}`);
      return {
        data: response.data,
        success: true,
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || 'Ошибка загрузки процедур',
        success: false,
        statusCode: error.response?.status || 500,
        data: []
      };
    }
  }

  async createProcedure(procedure: Omit<Procedure, 'id'>): Promise<Procedure> {
    const response = await this.api.post<Procedure>('/api/v1/medical/procedures', procedure);
    return response.data;
  }

  async updateProcedureStatus(procedureId: number, status: 'SCHEDULED' | 'IN_PROGRES' | 'COMPLETED' | 'CANCELLED'): Promise<Procedure> {
    const response = await this.api.patch<Procedure>(`/api/v1/medical/procedures/${procedureId}`, { status });
    return response.data;
  }

  async createPrescription(prescription: {
    patient_id: number;
    prescription_type: 'PROCEDURE' | 'MEASUREMENT' | 'NOTE';
    name: string;
    frequency?: string;
    dosage?: string;
    notes?: string;
    status?: 'ACTIVE';
  }): Promise<Prescription> {
    // ✅ Отправляем на /prescriptions, НЕ на /observations!
    const response = await this.api.post<Prescription>('/api/v1/medical/prescriptions', prescription);
    return response.data;
  }

  async getPrescriptions(patientId: number): Promise<Prescription[]> {
    // ✅ Получаем назначения, НЕ наблюдения!
    const response = await this.api.get<Prescription[]>(`/api/v1/medical/prescriptions/patient/${patientId}`);
    return response.data;
  }

  // ✅ Для медсестры — выполнение назначения
  async executePrescription(prescriptionId: number, notes?: string): Promise<Procedure> {
    const response = await this.api.post<Procedure>(
      `/api/v1/medical/prescriptions/${prescriptionId}/execute`,
      { notes }
    );
    return response.data;
  }

  // Назначения
  async getAppointments(patientId: number): Promise<ApiResponse<Appointment[]>> {
    try {
      const response = await this.api.get<Appointment[]>(`/api/v1/medical/appointments/${patientId}`);
      return {
        data: response.data,
        success: true,
        statusCode: response.status
      };
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || 'Ошибка загрузки назначений',
        success: false,
        statusCode: error.response?.status || 500,
        data: []
      };
    }
  }

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const response = await this.api.post<Appointment>('/api/v1/medical/appointments', appointment);
    return response.data;
  }

  // Форма 530н
  async getForm530n(patientId: number): Promise<Form530n> {
    const response = await this.api.get<Form530n>(`/api/v1/medical/form-530n/${patientId}`);
    return response.data;
  }

  async printForm530n(patientId: number): Promise<Blob> {
    const response = await this.api.get(`/api/v1/medical/form-530n/${patientId}/print`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // 1C интеграция
  async syncWith1C(): Promise<any> {
    const response = await this.api.post('/api/v1/integration/1c/sync');
    return response.data;
  }

  async getPatientsFrom1C(): Promise<Patient[]> {
    const response = await this.api.get<Patient[]>('/api/v1/integration/1c/patients');
    return response.data;
  }
}

// Экспортируем singleton экземпляр
export const apiService = new ApiService();
export default apiService;