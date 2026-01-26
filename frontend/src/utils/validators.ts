export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateTemperature = (temp: number): boolean => {
  return temp >= 35 && temp <= 42;
};

export const validateBloodPressure = (systolic: number, diastolic: number): boolean => {
  return systolic >= 60 && systolic <= 250 && 
         diastolic >= 40 && diastolic <= 150 &&
         systolic > diastolic;
};

export const validatePulse = (pulse: number): boolean => {
  return pulse >= 30 && pulse <= 200;
};

export const validatePatientData = (patient: any): string[] => {
  const errors: string[] = [];
  
  if (!patient.full_name?.trim()) {
    errors.push('ФИО обязательно');
  }
  
  if (!patient.admission_date) {
    errors.push('Дата поступления обязательна');
  }
  
  return errors;
};

export const validateObservation = (observation: any): string[] => {
  const errors: string[] = [];
  
  if (!observation.patient_id) {
    errors.push('ID пациента обязателен');
  }
  
  if (observation.temperature && !validateTemperature(observation.temperature)) {
    errors.push('Температура должна быть между 35 и 42°C');
  }
  
  if (observation.blood_pressure_systolic && observation.blood_pressure_diastolic) {
    if (!validateBloodPressure(observation.blood_pressure_systolic, observation.blood_pressure_diastolic)) {
      errors.push('Некорректное значение давления');
    }
  }
  
  if (observation.pulse && !validatePulse(observation.pulse)) {
    errors.push('Пульс должен быть между 30 и 200 уд/мин');
  }
  
  return errors;
};