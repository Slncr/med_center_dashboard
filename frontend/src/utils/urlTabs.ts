/** Идентификаторы вкладок для query-параметра ?tab= */

export const NURSE_TABS = [
  'patients',
  'form530n',
  'appointments',
  'bracelets',
  'rooms',
  'archive',
] as const;

export type NurseTab = (typeof NURSE_TABS)[number];

export const DOCTOR_TABS = [
  'patients',
  'prescriptions',
  'reports',
  'archive',
] as const;

export type DoctorTab = (typeof DOCTOR_TABS)[number];

export const PATIENT_CARD_TABS = [
  'observations',
  'procedures',
  'measurements',
  'prescriptions',
  'statuses',
  'bracelet',
] as const;

export type PatientCardTab = (typeof PATIENT_CARD_TABS)[number];

export const PRESCRIPTION_FORM_TABS = ['procedures', 'measurements'] as const;

export type PrescriptionFormTab = (typeof PRESCRIPTION_FORM_TABS)[number];

export const DOCTOR_REPORTS = ['patients', 'prescriptions', 'form530n', 'department'] as const;

export type DoctorReportKind = (typeof DOCTOR_REPORTS)[number];

export const APPOINTMENTS_DISPLAY_TABS = ['appointments', 'procedures'] as const;

export type AppointmentsDisplayTab = (typeof APPOINTMENTS_DISPLAY_TABS)[number];

/** Имена query-параметров */
export const URL_PARAMS = {
  tab: 'tab',
  patient: 'patient',
  card: 'card',
  cardTab: 'cardTab',
  subtab: 'subtab',
  report: 'report',
  room: 'room',
} as const;
