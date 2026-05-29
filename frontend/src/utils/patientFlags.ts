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
