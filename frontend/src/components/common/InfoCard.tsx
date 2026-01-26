import React from 'react';
import Card from './Card';
import './Card.css';

interface InfoCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  icon,
  trend,
  description,
  variant = 'default'
}) => {
  return (
    <Card className={`info-card card-${variant}`} hoverable>
      <div className="info-card-content">
        <div className="info-card-header">
          <div className="info-card-title">{title}</div>
          {icon && <div className="info-card-icon">{icon}</div>}
        </div>
        
        <div className="info-card-value">{value}</div>
        
        {(trend || description) && (
          <div className="info-card-footer">
            {trend && (
              <div className={`info-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
            {description && (
              <div className="info-card-description">{description}</div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default InfoCard;