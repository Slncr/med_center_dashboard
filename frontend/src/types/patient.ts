export interface Patient {
  department_name: string;
  id: number;
  full_name: string;
  birth_date?: string;
  gender?: string;
  medical_record_number?: string;
  admission_date: string;
  discharge_date?: string;
  status: 'active' | 'discharged';
  bed_id?: number;
  created_by?: number;
  external_id?: string; // UIID из 1С
}

export interface Bed {
  id: number;
  number: number;
  room_id: number;
  is_occupied: boolean;
  external_id?: string;
  patient?: Patient;
}

export interface Room {
  id: number;
  number: string;
  name?: string;
  description?: string;
  max_beds: number;
  floor?: number;
  wing?: string;
  beds: Bed[];
}

export interface PatientSelectResponse {
  message: string;
  success: boolean;
  welcome_message?: string;
  patient?: Patient;
}

export interface PatientStatus {
  id: number;
  name: string;
  color: string;
}