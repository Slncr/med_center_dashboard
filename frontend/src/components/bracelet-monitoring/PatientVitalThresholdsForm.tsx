import React, { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import type { MetricThresholdValues, PatientVitalThresholds } from '../../types/braceletAlerts';
import {
  EMPTY_METRIC_OVERRIDE,
  enabledFlagsFromOverrides,
  formToOverridesPayload,
  formatThresholdSummary,
  metricHasCustomEffective,
  overridesToForms,
  type MetricOverrideForm,
} from '../../utils/braceletThresholdDefaults';
import MetricThresholdFields from './MetricThresholdFields';
import { appAlert, appConfirm } from '../../context/AppDialogContext';
import './PatientVitalThresholdsForm.css';

interface PatientVitalThresholdsFormProps {
  patientId: number;
  patientName?: string;
  compact?: boolean;
  /** Форма внутри модалки — без дублирующего заголовка */
  inModal?: boolean;
  onSaved?: () => void;
}

const PatientVitalThresholdsForm: React.FC<PatientVitalThresholdsFormProps> = ({
  patientId,
  patientName,
  compact = false,
  inModal = false,
  onSaved,
}) => {
  const [data, setData] = useState<PatientVitalThresholds | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, MetricOverrideForm>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  const applyThresholdsData = (thresholds: PatientVitalThresholds) => {
    setData(thresholds);
    setForms(overridesToForms(thresholds.defaults, thresholds.overrides ?? undefined));
    setEnabled(
      enabledFlagsFromOverrides(
        thresholds.defaults,
        thresholds.overrides ?? undefined,
        thresholds.effective,
      ),
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const thresholds = await apiService.getPatientVitalThresholds(patientId);
      applyThresholdsData(thresholds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки порогов');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const overrides = formToOverridesPayload(data.defaults, forms, enabled);
      if (!overrides) {
        setError('Включите «Свои пороги» и заполните хотя бы одно поле');
        setSaving(false);
        return;
      }
      const updated = await apiService.updatePatientVitalThresholds(patientId, overrides);
      applyThresholdsData(updated);
      onSaved?.();
      if (!compact && !inModal) {
        await appAlert('Пороги сохранены');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!(await appConfirm('Сбросить персональные пороги и использовать стандартные?'))) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiService.resetPatientVitalThresholds(patientId);
      applyThresholdsData(updated);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="patient-thresholds-form loading">Загрузка порогов…</div>;
  }

  if (!data) {
    return <div className="patient-thresholds-form error">{error ?? 'Нет данных'}</div>;
  }

  const metricKeys = Object.keys(data.defaults);

  return (
    <div className={`patient-thresholds-form ${compact ? 'compact' : ''} ${inModal ? 'in-modal' : ''}`}>
      {!compact && !inModal && (
        <div className="patient-thresholds-form__header">
          <h3>Пороги браслета</h3>
          {patientName && <p className="patient-thresholds-form__patient">{patientName}</p>}
          <p className="patient-thresholds-form__desc">
            Для каждого показателя включите «Свои пороги» и заполните нужные поля. Пустые поля
            берутся из стандарта. Технические метрики (сигнал, шаги) не настраиваются.
          </p>
        </div>
      )}

      {inModal && (
        <p className="patient-thresholds-form__desc patient-thresholds-form__desc--modal">
          Для каждого показателя включите «Свои пороги» и заполните нужные поля. Пустые поля
          берутся из стандарта.
        </p>
      )}

      {error && <div className="patient-thresholds-form__error">{error}</div>}

      {data.has_custom && (
        <div className="patient-thresholds-form__badge">Есть персональные пороги</div>
      )}

      <div className="patient-thresholds-form__effective">
        {metricKeys.map((key) => {
          const t = data.effective[key] as MetricThresholdValues | undefined;
          if (!t) return null;
          return (
            <span key={key}>
              {t.label}: {formatThresholdSummary(t)}
            </span>
          );
        })}
      </div>

      <div className="patient-thresholds-form__metrics">
        {metricKeys.map((key) => {
          const defaults = data.defaults[key];
          if (!defaults) return null;
          return (
            <MetricThresholdFields
              key={key}
              title={defaults.label}
              fieldIdPrefix={`${patientId}-${key}`}
              defaults={defaults}
              effective={data.effective[key]}
              isCustom={metricHasCustomEffective(defaults, data.effective[key])}
              values={forms[key] ?? { ...EMPTY_METRIC_OVERRIDE }}
              enabled={Boolean(enabled[key])}
              onEnabledChange={(value) =>
                setEnabled((prev) => ({ ...prev, [key]: value }))
              }
              onChange={(field, value) => {
                setForms((prev) => ({
                  ...prev,
                  [key]: { ...(prev[key] ?? EMPTY_METRIC_OVERRIDE), [field]: value },
                }));
                if (value.trim()) {
                  setEnabled((prev) => ({ ...prev, [key]: true }));
                }
              }}
            />
          );
        })}
      </div>

      <div className="patient-thresholds-form__actions">
        <button type="button" className="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить пороги'}
        </button>
        <button type="button" className="secondary" onClick={handleReset} disabled={saving}>
          Стандартные пороги
        </button>
      </div>
    </div>
  );
};

export default PatientVitalThresholdsForm;
