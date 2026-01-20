export interface Observation {
  patient_id: number;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse?: number;
  notes?: string;
  date: string;
}

export interface Procedure {
  id: number;
  patient_id: number;
  name: string;
  description?: string;
  status: string;
  time?: string;
}

export interface Form530n {
  patient_id: number;
  form_name: string;
  observations: Observation[];
  procedures: Procedure[];
  last_updated: string;
}