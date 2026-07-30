import React, { useState } from 'react';
import { useOperatingRoomStatus } from '../hooks/useOperatingRoomStatus';
import { OR_STATUS_OPTIONS, OrStatus } from '../utils/operatingRoomStatus';
import './OperatingRoomTabletPage.css';

const OperatingRoomTabletPage: React.FC = () => {
  const { status: activeStatus, setStatusOptimistic, saveStatus } = useOperatingRoomStatus();
  const [saving, setSaving] = useState(false);

  const handleSelect = async (status: OrStatus) => {
    if (status === activeStatus || saving) return;
    const prev = activeStatus;
    setStatusOptimistic(status);
    setSaving(true);
    try {
      await saveStatus(status);
    } catch (err) {
      console.error('OR status update failed', err);
      setStatusOptimistic(prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="or-tablet">
      <div className="or-tablet__list" role="listbox" aria-label="Статус операционной">
        {OR_STATUS_OPTIONS.map((option) => {
          const isActive = activeStatus === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={isActive}
              disabled={saving && !isActive}
              className={`or-status ${isActive ? 'is-active' : ''}`}
              style={
                isActive
                  ? ({
                      ['--or-status-color' as string]: option.color,
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => void handleSelect(option.id)}
            >
              {isActive ? (
                <>
                  <span className="or-status__icon-wrap" aria-hidden>
                    <img className="or-status__icon" src={option.icon} alt="" />
                  </span>
                  <span className="or-status__divider" aria-hidden />
                  <span className="or-status__text">
                    <span className="or-status__label">{option.tabletLabel}</span>
                    {option.tabletSubtitle ? (
                      <span className="or-status__subtitle">{option.tabletSubtitle}</span>
                    ) : null}
                  </span>
                </>
              ) : (
                <span className="or-status__label">{option.tabletLabel}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OperatingRoomTabletPage;
