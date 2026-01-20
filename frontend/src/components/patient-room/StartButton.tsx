import React from 'react';
import './StartButton.css';

interface StartButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

const StartButton: React.FC<StartButtonProps> = ({ onClick, loading, disabled }) => {
  return (
    <button
      className={`start-button ${loading ? 'loading' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="spinner"></span>
          <span className="text">ЗАГРУЗКА...</span>
        </>
      ) : (
        <span className="text">СТАРТ</span>
      )}
    </button>
  );
};

export default StartButton;