import { Patient, PatientFeatureFlags } from '../types';

export const DEFAULT_FEATURE_FLAGS: PatientFeatureFlags = {
  flag_white: false,
  flag_yellow: false,
  flag_red: false,
  flag_orange: false,
  flag_green: false,
};

export const flagsFromPatient = (patient?: Patient | null): PatientFeatureFlags => ({
  flag_white: Boolean(patient?.flag_white),
  flag_yellow: Boolean(patient?.flag_yellow),
  flag_red: Boolean(patient?.flag_red),
  flag_orange: Boolean(patient?.flag_orange),
  flag_green: Boolean(patient?.flag_green),
});

export type BedFlagColor = 'white' | 'yellow' | 'orange' | 'red' | 'green';

export type PatientFlagKey = keyof PatientFeatureFlags;

export const PATIENT_FLAG_META: ReadonlyArray<{
  key: PatientFlagKey;
  color: BedFlagColor;
  label: string;
}> = [
  { key: 'flag_white', color: 'white', label: 'Всё в порядке' },
  { key: 'flag_yellow', color: 'yellow', label: 'Риск падения' },
  { key: 'flag_orange', color: 'orange', label: 'Инфекция' },
  { key: 'flag_red', color: 'red', label: 'Аллергия' },
  { key: 'flag_green', color: 'green', label: 'Диета' },
];

/** Активные статусы пациента для отображения в UI (без картинки койки). */
export const activePatientFlagStatuses = (patient?: Patient | null) => {
  const flags = flagsFromPatient(patient);
  if (flags.flag_white) {
    return PATIENT_FLAG_META.filter((item) => item.key === 'flag_white');
  }
  return PATIENT_FLAG_META.filter(
    (item) => item.key !== 'flag_white' && flags[item.key],
  );
};

export const bedFlagsFromPatient = (patient?: Patient | null) => {
  const flags = flagsFromPatient(patient);
  return {
    leftTop: flags.flag_yellow ? 'yellow' : 'white',
    leftBottom: flags.flag_orange ? 'orange' : 'white',
    rightTop: flags.flag_red ? 'red' : 'white',
    rightBottom: flags.flag_green ? 'green' : 'white',
  } as {
    leftTop: BedFlagColor;
    leftBottom: BedFlagColor;
    rightTop: BedFlagColor;
    rightBottom: BedFlagColor;
  };
};

export const toggleFeatureFlag = (
  prev: PatientFeatureFlags,
  name: keyof PatientFeatureFlags,
): PatientFeatureFlags => {
  if (name === 'flag_white') {
    if (prev.flag_white) return { ...DEFAULT_FEATURE_FLAGS };
    return {
      flag_white: true,
      flag_yellow: false,
      flag_red: false,
      flag_orange: false,
      flag_green: false,
    };
  }
  return {
    ...prev,
    [name]: !prev[name],
    flag_white: false,
  };
};
