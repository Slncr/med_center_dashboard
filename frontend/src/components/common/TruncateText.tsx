import React from 'react';
import './TruncateText.css';

interface TruncateTextProps {
  text: string;
  className?: string;
  maxLines?: 1;
}

/** Обрезка длинного текста с полным текстом во всплывающей подсказке (title). */
const TruncateText: React.FC<TruncateTextProps> = ({ text, className = '' }) => {
  if (!text || text === '—') {
    return <span className={`truncate-text empty ${className}`}>—</span>;
  }

  return (
    <span className={`truncate-text ${className}`} title={text}>
      {text}
    </span>
  );
};

export default TruncateText;
