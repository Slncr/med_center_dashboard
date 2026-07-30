import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  enterAppFullscreen,
  isImmersiveUi,
  isIosDevice,
  subscribeFullscreenChange,
} from '../../utils/fullscreen';
import './AppFullscreenGate.css';

const isPublicDisplayPath = (pathname: string): boolean =>
  pathname === '/login' ||
  // Логин не должен дергать fullscreen.
  pathname === '/or' ||
  pathname.startsWith('/or/');

/** Полноэкранный режим для всех экранов, кроме исключений выше. */
const AppFullscreenGate: React.FC = () => {
  const { pathname } = useLocation();
  const disabled = isPublicDisplayPath(pathname);
  const isRoomDisplay = pathname === '/room' || pathname.startsWith('/room/');
  const isIos = isIosDevice();
  const [needsGate, setNeedsGate] = useState(() => !disabled && !isImmersiveUi());

  useEffect(() => {
    if (disabled) {
      setNeedsGate(false);
      return undefined;
    }
    const sync = () => setNeedsGate(!isImmersiveUi());
    sync();
    return subscribeFullscreenChange(sync);
  }, [disabled]);

  useEffect(() => {
    if (disabled || isIos) return undefined;
    void enterAppFullscreen().then((ok: boolean) => {
      if (ok) setNeedsGate(false);
    });
    return undefined;
  }, [disabled, isIos, pathname]);

  useEffect(() => {
    if (!needsGate || disabled || isIos) return undefined;
    const onFirstPointer = () => {
      void enterAppFullscreen().then((ok: boolean) => {
        if (ok || isImmersiveUi()) setNeedsGate(false);
      });
    };
    window.addEventListener('pointerdown', onFirstPointer, { capture: true });
    return () => window.removeEventListener('pointerdown', onFirstPointer, true);
  }, [needsGate, disabled, isIos]);

  const handleEnter = useCallback(() => {
    if (isIos) return;
    void enterAppFullscreen().then((ok: boolean) => {
      if (ok || isImmersiveUi()) setNeedsGate(false);
    });
  }, [isIos]);

  const dismiss = useCallback(() => setNeedsGate(false), []);

  if (disabled || !needsGate) return null;

  // На экранах палат не показываем кнопку подтверждения fullscreen.
  // В большинстве kiosk-сценариев fullscreen успевает включиться автоматически;
  // если браузер заблокирует из‑за отсутствия user-gesture, мы продолжим слушать
  // первый pointerdown, но UI-опрос пользователю показывать не будем.
  if (isRoomDisplay) return null;

  return (
    <div className="app-fs-gate">
      {isIos ? (
        <>
          <span className="app-fs-gate-title">Скрыть адресную строку</span>
          <span className="app-fs-gate-hint">
            На iPad: Поделиться → «На экран „Домой“», затем открыть ярлык
          </span>
          <button type="button" className="app-fs-gate-btn" onClick={dismiss}>
            Понятно
          </button>
        </>
      ) : (
        <button
          type="button"
          className="app-fs-gate-btn app-fs-gate-btn--primary"
          onClick={handleEnter}
        >
          <span className="app-fs-gate-title">Полный экран</span>
          <span className="app-fs-gate-hint">Нажмите, чтобы скрыть адресную строку</span>
        </button>
      )}
    </div>
  );
};

export default AppFullscreenGate;
