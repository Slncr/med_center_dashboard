export type ObservationType = 
  | 'temperature' 
  | 'blood_pressure' 
  | 'pulse' 
  | 'respiration' 
  | 'weight' 
  | 'height' 
  | 'other';

export type ProcedureStatus = 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface Observation {
  id: number;
  patient_id: number;
  record_date: string;
  temperature: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  pulse: number | null;
  complaints: string | null;
  examination: string | null;
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
  id?: number;
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

export interface Form530n {
  patient_id: number;
  form_name: string;
  observations: Observation[];
  procedures: Procedure[];
  appointments: Appointment[];
  last_updated: string;
}

export interface MedicalRecord {
  id?: number;
  patient_id: number;
  record_date: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse?: number;
  respiration_rate?: number;
  spO2?: number;
  weight?: number;
  height?: number;
  complaints?: string;
  examination?: string;
  diagnosis?: string;
  recommendations?: string;
  created_by?: number;
}