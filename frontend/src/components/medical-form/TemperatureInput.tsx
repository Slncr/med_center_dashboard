import React, { useState, useEffect } from 'react';
import './TemperatureInput.css';

interface TemperatureInputProps {
  value?: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
}

const TemperatureInput: React.FC<TemperatureInputProps> = ({
  value = 36.6,
  onChange,
  label = 'Температура (°C)',
  disabled = false
}) => {
  const [temp, setTemp] = useState(value);

  useEffect(() => {
    setTemp(value);
  }, [value]);

  const handleChange = (newTemp: number) => {
    const rounded = Math.round(newTemp * 10) / 10; // Округление до 0.1
    if (rounded >= 35 && rounded <= 42) {
      setTemp(rounded);
      onChange(rounded);
    }
  };

  const increaseTemp = () => handleChange(temp + 0.1);
  const decreaseTemp = () => handleChange(temp - 0.1);

  const getTemperatureStatus = (temperature: number): { text: string; className: string } => {
    if (temperature < 35.5) return { text: 'Гипотермия', className: 'status-hypothermia' };
    if (temperature < 36.0) return { text: 'Пониженная', className: 'status-low' };
    if (temperature <= 37.2) return { text: 'Нормальная', className: 'status-normal' };
    if (temperature <= 38.0) return { text: 'Субфебрильная', className: 'status-fever' };
    if (temperature <= 39.0) return { text: 'Фебрильная', className: 'status-high-fever' };
    return { text: 'Высокая', className: 'status-critical' };
  };

  const status = getTemperatureStatus(temp);

  return (
    <div className="temperature-input">
      <div className="temperature-label">
        <span>{label}</span>
        <span className={`status-indicator ${status.className}`}>
          {status.text}
        </span>
      </div>

      <div className="temperature-controls">
        <div className="temperature-buttons">
          <button
            type="button"
            className="temp-button decrease"
            onClick={decreaseTemp}
            disabled={disabled || temp <= 35}
            aria-label="Уменьшить температуру"
          >
            −
          </button>
        </div>

        <div className="temperature-value">
          {temp.toFixed(1)}°C
        </div>

        <div className="temperature-buttons">
          <button
            type="button"
            className="temp-button increase"
            onClick={increaseTemp}
            disabled={disabled || temp >= 42}
            aria-label="Увеличить температуру"
          >
            +
          </button>
        </div>
      </div>

      <div className="temperature-slider">
        <input
          type="range"
          min="35"
          max="42"
          step="0.1"
          value={temp}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          disabled={disabled}
          aria-label="Регулятор температуры"
        />
        <div className="temperature-range">
          <span>35°C</span>
          <span>38.5°C</span>
          <span>42°C</span>
        </div>
      </div>

      <div className="temperature-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Гипотермия:</span>
            <span className="info-value">&lt;35.5°C</span>
          </div>
          <div className="info-item">
            <span className="info-label">Норма:</span>
            <span className="info-value">36.0-37.2°C</span>
          </div>
          <div className="info-item">
            <span className="info-label">Лихорадка:</span>
            <span className="info-value">&gt;37.2°C</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemperatureInput;