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
  Prescription,
  HealthCheckResponse,
  ApiResponse,
  MonitoringDashboard,
} from '../types';

const API_BASE_URL = '/api/v1';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
    
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
        // ✅ Берём токен из единого источника
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  
  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  // ✅ ЕДИНСТВЕННЫЙ МЕТОД ДЛЯ УСТАНОВКИ ТОКЕНА
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await axios.get<HealthCheckResponse>('/health');
    return response.data;
  }

  // Аутентификация
  async login(credentials: { username: string; password: string }): Promise<{ access_token: string; token_type: string }> {
    const response = await this.api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      credentials,
    );
    this.setToken(response.data.access_token);
    return response.data;
  }
  
  logout(): void {
    this.setToken(null);
    localStorage.removeItem('user_profile');
  }

  async registerUser(userData: {
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: 'doctor' | 'nurse';
  }): Promise<void> {
    await this.api.post('/users/register', {
      ...userData,
      role: userData.role,
    });
  }

  async getUsers(): Promise<User[]> {
    const response = await this.api.get<User[]>('/users/');
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<User>('/users/me');
    return response.data;
  }

  // Пациенты
  async getPatients(): Promise<Patient[]> {
    const response = await this.api.get<Patient[]>('/patients/');
    return response.data;
  }

  async getPatient(id: number): Promise<Patient> {
    const response = await this.api.get<Patient>(`/patients/${id}`);
    return response.data;
  }

  async selectPatient(patientId: number): Promise<PatientSelectResponse> {
    const response = await this.api.post<PatientSelectResponse>(`/patients/${patientId}/select`);
    return response.data;
  }

  async getArchivedPatients(): Promise<Patient[]> {
    const response = await this.api.get<Patient[]>('/patients/archived');
    return response.data;
  }

  async archivePatient(patientId: number): Promise<Patient> {
    const response = await this.api.patch<Patient>(`/patients/${patientId}/archive`);
    return response.data;
  }

  async restorePatient(patientId: number): Promise<Patient> {
    const response = await this.api.patch<Patient>(`/patients/${patientId}/restore`);
    return response.data;
  }

  // Палаты
  async getRooms(): Promise<Room[]> {
    const response = await this.api.get<Room[]>('/rooms/');
    return response.data;
  }

  async getRoom(id: number): Promise<Room> {
    const response = await this.api.get<Room>(`/rooms/${id}`);
    return response.data;
  }

  // Наблюдения
  async getObservations(patientId: number): Promise<Observation[]> {
    const response = await this.api.get<Observation[]>(`/medical/observations/${patientId}`);
    return response.data;
  }

  async createObservation(observation: Omit<Observation, 'id' | 'created_at'>): Promise<Observation> {
    const response = await this.api.post<Observation>('/medical/observations', observation);
    return response.data;
  }

  async updateObservation(id: number, updates: Partial<Omit<Observation, 'id' | 'created_at' | 'patient_id' | 'record_date'>>): Promise<Observation> {
    const response = await this.api.put<Observation>(`/medical/observations/${id}`, updates);
    return response.data;
  }

  async deleteObservation(id: number): Promise<void> {
    await this.api.delete(`/medical/observations/${id}`);
  }

  // Процедуры
  async getProcedures(patientId: number): Promise<ApiResponse<Procedure[]>> {
    try {
      const response = await this.api.get<Procedure[]>(`/medical/procedures/${patientId}`);
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
    const response = await this.api.post<Procedure>('/medical/procedures', procedure);
    return response.data;
  }

  async updateProcedureStatus(
    procedureId: number,
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): Promise<Procedure> {
    const response = await this.api.patch<Procedure>(
      `/medical/procedures/${procedureId}/status`,
      { status }
    );
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
    const response = await this.api.post<Prescription>('/medical/prescriptions', prescription);
    return response.data;
  }

  async createPrescriptionsBatch(
    patientId: number,
    prescriptions: Array<{
      prescription_type: 'PROCEDURE' | 'MEASUREMENT' | 'NOTE';
      name: string;
      frequency?: string;
      dosage?: string;
      notes?: string;
      status?: 'ACTIVE';
    }>,
  ): Promise<Prescription[]> {
    const response = await this.api.post<Prescription[]>('/medical/prescriptions/batch', {
      patient_id: patientId,
      prescriptions,
    });
    return response.data;
  }

  async getPrescriptions(patientId: number): Promise<Prescription[]> {
    // ✅ Получаем назначения, НЕ наблюдения!
    const response = await this.api.get<Prescription[]>(`/medical/prescriptions/patient/${patientId}`);
    return response.data;
  }

  // ✅ Для медсестры — выполнение назначения
  async executePrescription(prescriptionId: number, notes?: string): Promise<Procedure> {
    const response = await this.api.post<Procedure>(
      `/medical/prescriptions/${prescriptionId}/execute`,
      { notes }
    );
    return response.data;
  }

  // Назначения
  async getAppointments(patientId: number): Promise<ApiResponse<Appointment[]>> {
    try {
      const response = await this.api.get<Appointment[]>(`/medical/appointments/${patientId}`);
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

  async cancelPrescription(prescriptionId: number): Promise<Prescription> {
    const response = await this.api.patch<Prescription>(
      `/medical/prescriptions/${prescriptionId}/cancel`,
    );
    return response.data;
  }

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const response = await this.api.post<Appointment>('/medical/appointments', appointment);
    return response.data;
  }

  // Форма 530н
  async getForm530n(
    patientId: number,
    params?: { date_from?: string; date_to?: string },
  ): Promise<Form530n> {
    const response = await this.api.get<Form530n>(`/medical/form-530n/${patientId}`, {
      params,
    });
    return response.data;
  }

  async printForm530n(
    patientId: number,
    params?: { date_from?: string; date_to?: string },
  ): Promise<Blob> {
    const response = await this.api.get(`/medical/form-530n/${patientId}/print`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // 1C интеграция
  async syncWith1C(): Promise<any> {
    const response = await this.api.post('/integration/1c/sync');
    return response.data;
  }

  async getPatientsFrom1C(): Promise<Patient[]> {
    const response = await this.api.get<Patient[]>('/integration/1c/patients');
    return response.data;
  }

  async getMonitoringDashboard(roomId: number): Promise<MonitoringDashboard> {
    const response = await this.api.get<MonitoringDashboard>('/monitoring/dashboard', {
      params: { room_id: roomId },
    });
    return response.data;
  }

  async getMonitoringHealth(): Promise<Record<string, unknown>> {
    const response = await this.api.get<Record<string, unknown>>('/monitoring/health');
    return response.data;
  }
}

// Экспортируем singleton экземпляр
export const apiService = new ApiService();
export default apiService;