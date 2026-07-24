import React from 'react';
import type { VitalAlertLevel } from '../../types/braceletAlerts';
import { levelClassName, levelLabel } from '../../utils/braceletVitals';
import './VitalMetricBadge.css';

interface VitalMetricBadgeProps {
  label: string;
  value: string;
  level?: VitalAlertLevel;
  compact?: boolean;
}

const VitalMetricBadge: React.FC<VitalMetricBadgeProps> = ({
  label,
  value,
  level = 'normal',
  compact = false,
}) => (
  <div
    className={`vital-metric-badge ${compact ? 'vital-metric-badge--compact' : ''} ${levelClassName(level)}`}
  >
    <span className="vital-metric-badge__label">{label}</span>
    <span className="vital-metric-badge__value">{value}</span>
    {!compact && level !== 'normal' && (
      <span className="vital-metric-badge__status">{levelLabel(level)}</span>
    )}
  </div>
);

export default VitalMetricBadge;
