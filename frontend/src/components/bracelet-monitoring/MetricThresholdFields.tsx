import React from 'react';
import type { MetricOverrideForm } from '../../utils/braceletThresholdDefaults';
import type { MetricThresholdValues } from '../../types/braceletAlerts';
import './MetricThresholdFields.css';

interface MetricThresholdFieldsProps {
  title: string;
  fieldIdPrefix?: string;
  defaults: MetricThresholdValues;
  values: MetricOverrideForm;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onChange: (field: keyof MetricOverrideForm, value: string) => void;
}

const MetricThresholdFields: React.FC<MetricThresholdFieldsProps> = ({
  title,
  fieldIdPrefix = 'global',
  defaults,
  values,
  enabled,
  onEnabledChange,
  onChange,
}) => {
  const inputId = `threshold-${fieldIdPrefix}-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
  <section className={`metric-threshold-fields ${enabled ? 'is-active' : ''}`}>
    <div className="metric-threshold-fields__toggle-row">
      <input
        id={inputId}
        type="checkbox"
        className="metric-threshold-fields__checkbox"
        checked={enabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
      />
      <label htmlFor={inputId} className="metric-threshold-fields__toggle-label">
        <strong>Свои пороги: {title}</strong>
        <span className="metric-threshold-fields__hint">
          {enabled
            ? 'заполните нужные поля; пустые — из стандарта'
            : `сейчас стандарт: ${defaults.normal_min ?? '—'}${
                defaults.normal_max != null ? `–${defaults.normal_max}` : ''
              } ${defaults.unit}`}
        </span>
      </label>
    </div>

    {enabled && (
      <div className="metric-threshold-fields__grid">
        <div className="metric-threshold-fields__group">
          <h4>Норма</h4>
          <label>
            Мин.
            <input
              type="number"
              placeholder={String(defaults.normal_min ?? '')}
              value={values.normal_min}
              onChange={(e) => onChange('normal_min', e.target.value)}
            />
          </label>
          <label>
            Макс.
            <input
              type="number"
              placeholder={defaults.normal_max != null ? String(defaults.normal_max) : '—'}
              value={values.normal_max}
              onChange={(e) => onChange('normal_max', e.target.value)}
            />
          </label>
        </div>
        <div className="metric-threshold-fields__group">
          <h4>Внимание</h4>
          <label>
            Ниже
            <input
              type="number"
              placeholder={defaults.warning_low != null ? String(defaults.warning_low) : '—'}
              value={values.warning_low}
              onChange={(e) => onChange('warning_low', e.target.value)}
            />
          </label>
          <label>
            Выше
            <input
              type="number"
              placeholder={defaults.warning_high != null ? String(defaults.warning_high) : '—'}
              value={values.warning_high}
              onChange={(e) => onChange('warning_high', e.target.value)}
            />
          </label>
        </div>
        <div className="metric-threshold-fields__group metric-threshold-fields__group--critical">
          <h4>Критично</h4>
          <label>
            Ниже
            <input
              type="number"
              placeholder={defaults.critical_low != null ? String(defaults.critical_low) : '—'}
              value={values.critical_low}
              onChange={(e) => onChange('critical_low', e.target.value)}
            />
          </label>
          <label>
            Выше
            <input
              type="number"
              placeholder={defaults.critical_high != null ? String(defaults.critical_high) : '—'}
              value={values.critical_high}
              onChange={(e) => onChange('critical_high', e.target.value)}
            />
          </label>
        </div>
      </div>
    )}
  </section>
  );
};

export default MetricThresholdFields;
