import React, { useState, useEffect } from 'react';
import './BloodPressureInput.css';

interface BloodPressureInputProps {
  systolic?: number;
  diastolic?: number;
  onChange: (systolic: number, diastolic: number) => void;
  label?: string;
  disabled?: boolean;
}

const BloodPressureInput: React.FC<BloodPressureInputProps> = ({
  systolic = 120,
  diastolic = 80,
  onChange,
  label = 'Артериальное давление',
  disabled = false
}) => {
  const [sys, setSys] = useState(systolic);
  const [dia, setDia] = useState(diastolic);

  useEffect(() => {
    setSys(systolic);
    setDia(diastolic);
  }, [systolic, diastolic]);

  const handleSystolicChange = (value: number) => {
    const newSys = Math.max(60, Math.min(250, value));
    setSys(newSys);
    if (newSys > dia) {
      onChange(newSys, dia);
    }
  };

  const handleDiastolicChange = (value: number) => {
    const newDia = Math.max(40, Math.min(150, value));
    setDia(newDia);
    if (sys > newDia) {
      onChange(sys, newDia);
    }
  };

  const getPressureStatus = (s: number, d: number): { text: string; className: string } => {
    if (s < 90 || d < 60) return { text: 'Пониженное', className: 'bp-low' };
    if (s <= 120 && d <= 80) return { text: 'Оптимальное', className: 'bp-optimal' };
    if (s <= 129 && d <= 84) return { text: 'Нормальное', className: 'bp-normal' };
    if (s <= 139 && d <= 89) return { text: 'Высокое нормальное', className: 'bp-elevated' };
    if (s <= 159 && d <= 99) return { text: 'Артериальная гипертензия 1 ст.', className: 'bp-high-1' };
    if (s <= 179 && d <= 109) return { text: 'Артериальная гипертензия 2 ст.', className: 'bp-high-2' };
    return { text: 'Артериальная гипертензия 3 ст.', className: 'bp-high-3' };
  };

  const status = getPressureStatus(sys, dia);

  const setNormal = () => {
    handleSystolicChange(120);
    handleDiastolicChange(80);
  };

  const setHigh = () => {
    handleSystolicChange(140);
    handleDiastolicChange(90);
  };

  const setLow = () => {
    handleSystolicChange(90);
    handleDiastolicChange(60);
  };

  return (
    <div className="blood-pressure-input">
      <div className="bp-label">{label}</div>
      
      <div className="bp-inputs">
        <div className="bp-field">
          <div className="bp-field-label">Систолическое (верхнее)</div>
          <input
            type="number"
            min="60"
            max="250"
            value={sys}
            onChange={(e) => handleSystolicChange(parseInt(e.target.value) || 120)}
            className="bp-input systolic"
            disabled={disabled}
            aria-label="Систолическое давление"
          />
        </div>

        <div className="bp-separator">/</div>

        <div className="bp-field">
          <div className="bp-field-label">Диастолическое (нижнее)</div>
          <input
            type="number"
            min="40"
            max="150"
            value={dia}
            onChange={(e) => handleDiastolicChange(parseInt(e.target.value) || 80)}
            className="bp-input diastolic"
            disabled={disabled}
            aria-label="Диастолическое давление"
          />
        </div>
      </div>

      <div className="bp-result">
        {sys}/{dia} мм рт.ст.
      </div>

      <div className={`bp-evaluation ${status.className}`}>
        {status.text}
      </div>

      <div className="bp-controls">
        <div className="bp-buttons">
          <button
            type="button"
            className="bp-button bp-normal-button"
            onClick={setNormal}
            disabled={disabled}
            aria-label="Установить нормальное давление"
          >
            Нормальное (120/80)
          </button>
          <button
            type="button"
            className="bp-button bp-high-button"
            onClick={setHigh}
            disabled={disabled}
            aria-label="Установить повышенное давление"
          >
            Повышенное (140/90)
          </button>
          <button
            type="button"
            className="bp-button bp-low-button"
            onClick={setLow}
            disabled={disabled}
            aria-label="Установить пониженное давление"
          >
            Пониженное (90/60)
          </button>
        </div>

        <div className="bp-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Оптимальное:</span>
              <span className="info-value">&lt;120/80</span>
            </div>
            <div className="info-item">
              <span className="info-label">Нормальное:</span>
              <span className="info-value">120-129/80-84</span>
            </div>
            <div className="info-item">
              <span className="info-label">Повышенное:</span>
              <span className="info-value">&gt;140/90</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloodPressureInput;