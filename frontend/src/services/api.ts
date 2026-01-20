import axios from 'axios';
import { Patient, Room, PatientSelectResponse, Observation, Procedure, Form530n } from '../types';

const API_BASE_URL = 'http://localhost:8000';

// Создаем экземпляр axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцепторы для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Функции API
export const apiService = {
  // Проверка здоровья API
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/health');
    return response.data;
  },

  // Получение списка палат
  getRooms: async (): Promise<Room[]> => {
    const response = await api.get('/api/rooms');
    return response.data;
  },

  // Получение палаты по ID
  getRoom: async (roomId: number): Promise<Room> => {
    const response = await api.get(`/api/rooms/${roomId}`);
    return response.data;
  },

  // Получение списка пациентов
  getPatients: async (): Promise<Patient[]> => {
    const response = await api.get('/api/v1/patients/');
    return response.data;
  },

  // Выбор пациента
  selectPatient: async (patientId: number): Promise<PatientSelectResponse> => {
    const response = await api.post(`/api/patient/${patientId}/select`);
    return response.data;
  },

  // Получение наблюдений пациента
  getObservations: async (patientId: number): Promise<Observation[]> => {
    const response = await api.get(`/api/v1/medical/observations/${patientId}`);
    return response.data;
  },

  // Добавление наблюдения
  addObservation: async (observation: Observation): Promise<any> => {
    const response = await api.post('/api/v1/medical/observations', observation);
    return response.data;
  },

  // Получение процедур пациента
  getProcedures: async (patientId: number): Promise<Procedure[]> => {
    const response = await api.get(`/api/v1/medical/procedures/${patientId}`);
    return response.data;
  },

  // Завершение процедуры
  completeProcedure: async (patientId: number, procedureId: number): Promise<any> => {
    const response = await api.post(`/api/v1/medical/procedures/${patientId}/complete/${procedureId}`);
    return response.data;
  },

  // Получение формы 530н
  getForm530n: async (patientId: number): Promise<Form530n> => {
    const response = await api.get(`/api/v1/medical/form-530n/${patientId}`);
    return response.data;
  },

  // Аутентификация
  login: async (username: string, password: string): Promise<any> => {
    const response = await api.post('/api/v1/auth/login', { username, password });
    return response.data;
  },

  // Получение информации о пользователе
  getCurrentUser: async (): Promise<any> => {
    const response = await api.get('/api/v1/auth/users/me');
    return response.data;
  }
};

export default apiService;