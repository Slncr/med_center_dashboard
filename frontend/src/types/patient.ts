export interface Patient {
  id: number;
  full_name: string;
  bed_id: number;
  room_number: string;
  admission_date?: string;
  status?: string;
}

export interface Room {
  id: number;
  number: string;
  beds: Bed[];
}

export interface Bed {
  id: number;
  number: number;
  patient: string;
  patient_id?: number;
}

export interface PatientSelectResponse {
  message: string;
  success: boolean;
  welcome_message?: string;
}