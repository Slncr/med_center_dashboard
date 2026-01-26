export type WebSocketEventType = 
  | 'patient_selected'
  | 'observation_added'
  | 'procedure_updated'
  | 'appointment_created'
  | 'notification'
  | 'error';

export interface WebSocketMessage {
  type: any;
  event: WebSocketEventType;
  data: any;
  timestamp: string;
  sender?: string;
  room?: string;
}

export interface PatientSelectedEvent {
  patient_id: number;
  patient_name: string;
  room_number: string;
  bed_number: number;
  timestamp: string;
}

export interface ObservationAddedEvent {
  patient_id: number;
  observation_id: number;
  temperature?: number;
  blood_pressure?: string;
  pulse?: number;
  timestamp: string;
}

export interface ProcedureUpdatedEvent {
  patient_id: number;
  procedure_id: number;
  status: string;
  completed_at?: string;
  timestamp: string;
}

export interface NotificationEvent {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}