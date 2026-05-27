export type ObservationType = 
  | 'temperature' 
  | 'blood_pressure' 
  | 'pulse' 
  | 'respiration' 
  | 'weight' 
  | 'height' 
  | 'other';

export type ProcedureStatus = 
  | 'SCHEDULED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface Observation {
  id: number;
  patient_id: number;
  record_date: string;
  temperature: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  pulse: number | null;
  respiration_rate?: number | null;   // ✅ Добавлено
  spO2?: number | null;               // ✅ Добавлено
  weight?: number | null;             // ✅ Добавлено
  height?: number | null;             // ✅ Добавлено
  complaints: string | null;
  examination: string | null;
  diagnosis?: string;                // ✅ Опционально
  recommendations?: string;          // ✅ Опционально
  created_at: string;
}

export interface Appointment {
  id?: number;
  patient_id: number;
  doctor_id: number;
  title: string;
  description?: string;
  appointment_date: string;
  appointment_time?: string;
  status: ProcedureStatus;
  notes?: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface Procedure {
  id: number;
  patient_id: number;
  name: string;
  description?: string;
  scheduled_time: string;
  status: ProcedureStatus;
  completed_at?: string;
  notes?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface Form530nPatientInfo {
  id: number;
  full_name: string;
  birth_date?: string | null;
  age?: number | null;
  gender?: string | null;
  medical_record_number?: string | null;
  admission_date?: string | null;
  department_name?: string | null;
  room_number?: string | null;
  bed_number?: string | null;
}

export interface Form530nObservationRow {
  id: number;
  record_date: string;
  record_time?: string | null;
  temperature?: number | null;
  pulse?: number | null;
  blood_pressure?: string | null;
  respiration_rate?: number | null;
  spO2?: number | null;
  weight?: number | null;
  height?: number | null;
  complaints?: string | null;
  examination?: string | null;
  diagnosis?: string | null;
  recommendations?: string | null;
}

export interface Form530nPrescriptionItem {
  id: number;
  name: string;
  prescription_type: string;
  frequency?: string | null;
  status: string;
}

export interface Form530nProcedureItem {
  id: number;
  name: string;
  status: string;
  scheduled_time?: string | null;
  notes?: string | null;
}

export interface Form530n {
  form_code: string;
  form_title: string;
  patient: Form530nPatientInfo;
  period_from: string;
  period_to: string;
  generated_at: string;
  observations: Form530nObservationRow[];
  prescriptions: Form530nPrescriptionItem[];
  procedures: Form530nProcedureItem[];
  observations_count: number;
}

export interface MedicalRecord {
  id?: number;
  patient_id: number;
  record_date: string;
  temperature?: number | null;               // ✅ null | undefined
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  pulse?: number | null;
  respiration_rate?: number | null;
  spO2?: number | null;
  weight?: number | null;
  height?: number | null;
  complaints?: string | null;
  examination?: string | null;
  diagnosis?: string | null;
  recommendations?: string | null;
  created_by?: number;
}

// ✅ Типы для назначений (отдельно от наблюдений!)
export type PrescriptionType = 'PROCEDURE' | 'MEASUREMENT' | 'NOTE';
export type PrescriptionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Prescription {
  id: number;
  patient_id: number;
  created_by: number;
  prescription_type: PrescriptionType;
  name: string;
  frequency?: string;
  dosage?: string;
  notes?: string;
  start_date: string;
  end_date?: string;
  status: PrescriptionStatus;
  completed_at?: string;
  created_at: string;
}

// ✅ Для выполнения назначения медсестрой
export interface PrescriptionExecution {
  notes?: string;
}