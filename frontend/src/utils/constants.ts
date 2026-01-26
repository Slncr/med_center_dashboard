// src/utils/constants.ts

// Конфигурация API
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

// Статусы пациентов
export const PATIENT_STATUSES = {
  ACTIVE: { id: 'active', name: 'Активный', color: 'green' },
  DISCHARGED: { id: 'discharged', name: 'Выписан', color: 'blue' },
  TRANSFERRED: { id: 'transferred', name: 'Переведен', color: 'orange' },
  TEMPORARY_ABSENT: { id: 'temporary_absent', name: 'Временно отсутствует', color: 'yellow' }
} as const;

export type PatientStatusType = keyof typeof PATIENT_STATUSES;

// Статусы процедур
export const PROCEDURE_STATUSES = {
  SCHEDULED: { id: 'scheduled', name: 'Запланировано', color: 'blue' },
  IN_PROGRESS: { id: 'in_progress', name: 'В процессе', color: 'orange' },
  COMPLETED: { id: 'completed', name: 'Выполнено', color: 'green' },
  CANCELLED: { id: 'cancelled', name: 'Отменено', color: 'red' }
} as const;

export type ProcedureStatusType = keyof typeof PROCEDURE_STATUSES;

// Роли пользователей
export const USER_ROLES = {
  NURSE: { id: 'nurse', name: 'Медсестра', permissions: ['read', 'write_observations'] },
  DOCTOR: { id: 'doctor', name: 'Врач', permissions: ['read', 'write', 'prescribe'] },
  ADMIN: { id: 'admin', name: 'Администратор', permissions: ['read', 'write', 'manage_users'] }
} as const;

export type UserRoleType = keyof typeof USER_ROLES;

// Поля формы 530н
export const FORM_530N_FIELDS = [
  { id: 'temperature', label: 'Температура (°C)', type: 'number', min: 35, max: 42, step: 0.1 },
  { id: 'blood_pressure_systolic', label: 'Давление (систолическое)', type: 'number', min: 60, max: 250 },
  { id: 'blood_pressure_diastolic', label: 'Давление (диастолическое)', type: 'number', min: 40, max: 150 },
  { id: 'pulse', label: 'Пульс (уд/мин)', type: 'number', min: 30, max: 200 },
  { id: 'respiration_rate', label: 'Дыхание (вдох/мин)', type: 'number', min: 8, max: 40 },
  { id: 'spO2', label: 'Сатурация (%)', type: 'number', min: 70, max: 100 },
  { id: 'weight', label: 'Вес (кг)', type: 'number', min: 1, max: 300, step: 0.1 },
  { id: 'height', label: 'Рост (см)', type: 'number', min: 30, max: 250 }
] as const;

// WebSocket события
export const WS_EVENTS = {
  PATIENT_SELECTED: 'patient_selected',
  PATIENT_UPDATED: 'patient_updated',
  PROCEDURE_UPDATED: 'procedure_updated',
  APPOINTMENT_UPDATED: 'appointment_updated',
  OBSERVATION_ADDED: 'observation_added',
  FORM_UPDATED: 'form_updated',
  PRINT_JOB_STATUS: 'print_job_status',
  SYNC_STATUS: 'sync_status',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
} as const;

export type WsEventType = keyof typeof WS_EVENTS;

// Константы для печати
export const PRINT_FORMATS = {
  PDF: 'pdf',
  HTML: 'html',
  DOCX: 'docx'
} as const;

export type PrintFormatType = keyof typeof PRINT_FORMATS;

export const PRINT_ORIENTATIONS = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape'
} as const;

export type PrintOrientationType = keyof typeof PRINT_ORIENTATIONS;

// Пути API
export const API_ENDPOINTS = {
  // Медицинские данные
  OBSERVATIONS: '/api/v1/medical/observations',
  PROCEDURES: '/api/v1/medical/procedures',
  APPOINTMENTS: '/api/v1/medical/appointments',
  FORM_530N: '/api/v1/medical/form-530n',
  
  // Печать
  PRINT_FORM_530N: '/api/v1/medical/form-530n/:patientId/print',
  PRINT_JOBS: '/api/v1/print/jobs',
  PRINT_REPORT_OBSERVATIONS: '/api/v1/print/report/observations',
  PRINT_REPORT_PROCEDURES: '/api/v1/print/report/procedures',
  PRINT_PATIENT_CARD: '/api/v1/print/patient-card',
  
  // WebSocket
  WS_CONNECT: '/ws',
  
  // Интеграция
  SYNC_1C: '/api/v1/integration/1c/sync',
  PATIENTS_1C: '/api/v1/integration/1c/patients',
  
  // Аутентификация
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  CURRENT_USER: '/api/v1/auth/users/me',
  
  // Пациенты и палаты
  PATIENTS: '/api/v1/patients',
  PATIENT_SELECT: '/api/v1/patients/:patientId/select',
  ROOMS: '/api/v1/rooms',
  
  // Health check
  HEALTH: '/health'
} as const;

// Константы времени
export const AUTO_REFRESH_INTERVAL = 30000; // 30 секунд
export const HEARTBEAT_INTERVAL = 25000; // 25 секунд
export const RECONNECT_INTERVAL = 5000; // 5 секунд
export const MAX_RECONNECT_ATTEMPTS = 20;

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка соединения с сервером',
  UNAUTHORIZED: 'Необходима авторизация',
  FORBIDDEN: 'Доступ запрещен',
  NOT_FOUND: 'Ресурс не найден',
  SERVER_ERROR: 'Ошибка сервера',
  VALIDATION_ERROR: 'Ошибка валидации данных',
  PRINT_ERROR: 'Ошибка при печати документа',
  SYNC_ERROR: 'Ошибка синхронизации с 1С',
  WS_CONNECTION_ERROR: 'Ошибка подключения к WebSocket'
} as const;

export type ErrorMessageType = keyof typeof ERROR_MESSAGES;

// Сообщения успеха
export const SUCCESS_MESSAGES = {
  PROCEDURE_UPDATED: 'Процедура успешно обновлена',
  OBSERVATION_ADDED: 'Наблюдение успешно добавлено',
  APPOINTMENT_CREATED: 'Назначение успешно создано',
  FORM_SAVED: 'Форма успешно сохранена',
  PRINT_STARTED: 'Печать документа начата',
  SYNC_STARTED: 'Синхронизация с 1С начата',
  PATIENT_SELECTED: 'Пациент успешно выбран',
  DATA_LOADED: 'Данные успешно загружены'
} as const;

export type SuccessMessageType = keyof typeof SUCCESS_MESSAGES;

// Константы для формы 530н
export const FORM_530N_SECTIONS = {
  OBSERVATIONS: 'observations',
  PROCEDURES: 'procedures',
  APPOINTMENTS: 'appointments',
  MEDICATIONS: 'medications'
} as const;

export type Form530nSectionType = keyof typeof FORM_530N_SECTIONS;

// Цвета для статусов (CSS классы или hex коды)
export const STATUS_COLORS = {
  // Процедуры
  SCHEDULED: '#3498db', // blue
  IN_PROGRESS: '#f39c12', // orange
  COMPLETED: '#27ae60', // green
  CANCELLED: '#e74c3c', // red
  
  // Пациенты
  ACTIVE: '#2ecc71', // green
  DISCHARGED: '#95a5a6', // grey
  TRANSFERRED: '#9b59b6', // purple
  TEMPORARY_ABSENT: '#f1c40f', // yellow
  
  // Печать
  PENDING: '#3498db', // blue
  PROCESSING: '#f39c12', // orange
  FAILED: '#e74c3c' // red
} as const;

// Ключи localStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'med_center_auth_token',
  SELECTED_PATIENT: 'med_center_selected_patient',
  USER_PREFERENCES: 'med_center_user_prefs',
  LAST_SYNC_TIME: 'med_center_last_sync'
} as const;

// Типы документов для печати
export const PRINT_TYPES = {
  FORM_530N: 'form530n',
  OBSERVATIONS_REPORT: 'observations',
  PROCEDURES_REPORT: 'procedures',
  PATIENT_CARD: 'patient-card',
  APPOINTMENTS_SCHEDULE: 'appointments'
} as const;

export type PrintType = keyof typeof PRINT_TYPES;

// Дефолтные значения
export const DEFAULTS = {
  PAGE_SIZE: 10,
  DATE_FORMAT: 'DD.MM.YYYY',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'DD.MM.YYYY HH:mm',
  TEMPERATURE_MIN: 35.0,
  TEMPERATURE_MAX: 42.0,
  BLOOD_PRESSURE_SYSTOLIC_MIN: 60,
  BLOOD_PRESSURE_SYSTOLIC_MAX: 250,
  BLOOD_PRESSURE_DIASTOLIC_MIN: 40,
  BLOOD_PRESSURE_DIASTOLIC_MAX: 150,
  PULSE_MIN: 30,
  PULSE_MAX: 200,
  RESPIRATION_MIN: 8,
  RESPIRATION_MAX: 40,
  SPO2_MIN: 70,
  SPO2_MAX: 100
} as const;

// Экспорт по умолчанию для удобства
export default {
  API_CONFIG,
  PATIENT_STATUSES,
  PROCEDURE_STATUSES,
  USER_ROLES,
  FORM_530N_FIELDS,
  WS_EVENTS,
  PRINT_FORMATS,
  PRINT_ORIENTATIONS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STATUS_COLORS,
  STORAGE_KEYS,
  PRINT_TYPES,
  DEFAULTS
};