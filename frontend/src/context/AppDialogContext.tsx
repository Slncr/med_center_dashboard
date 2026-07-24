import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import '../components/common/AppDialog.css';

export type AppDialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Только кнопка OK (вместо Да/Нет) */
  alertOnly?: boolean;
  danger?: boolean;
};

type DialogState = AppDialogOptions & {
  id: number;
  resolve: (value: boolean) => void;
};

type AppDialogApi = {
  confirm: (messageOrOptions: string | AppDialogOptions) => Promise<boolean>;
  alert: (messageOrOptions: string | AppDialogOptions) => Promise<void>;
};

const AppDialogContext = createContext<AppDialogApi | null>(null);

let imperativeApi: AppDialogApi | null = null;
let dialogSeq = 0;

const normalize = (messageOrOptions: string | AppDialogOptions): AppDialogOptions =>
  typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;

/** Подтверждение без хука (удобно в обработчиках). */
export function appConfirm(
  messageOrOptions: string | AppDialogOptions,
  extra?: Omit<AppDialogOptions, 'message'>,
): Promise<boolean> {
  if (!imperativeApi) {
    console.warn('[appDialog] provider is not mounted');
    return Promise.resolve(false);
  }
  const opts =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, ...extra }
      : { ...messageOrOptions, ...extra };
  return imperativeApi.confirm(opts);
}

/** Алерт без хука — модалка внутри приложения, не сбрасывает fullscreen. */
export function appAlert(
  messageOrOptions: string | AppDialogOptions,
  extra?: Omit<AppDialogOptions, 'message'>,
): Promise<void> {
  if (!imperativeApi) {
    console.warn('[appDialog] provider is not mounted');
    return Promise.resolve();
  }
  const opts =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, ...extra }
      : { ...messageOrOptions, ...extra };
  return imperativeApi.alert(opts);
}

export function useAppDialog(): AppDialogApi {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
}

export const AppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const openRef = useRef(false);

  const openDialog = useCallback((options: AppDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      if (openRef.current) {
        // Не копим очередь — закрываем текущий как cancel
        setDialog((prev) => {
          prev?.resolve(false);
          return null;
        });
      }
      openRef.current = true;
      const id = ++dialogSeq;
      setDialog({
        ...options,
        id,
        resolve: (value) => {
          openRef.current = false;
          resolve(value);
        },
      });
    });
  }, []);

  const api = useMemo<AppDialogApi>(
    () => ({
      confirm: (messageOrOptions) => {
        const opts = normalize(messageOrOptions);
        return openDialog({
          title: opts.title ?? 'Подтверждение',
          confirmLabel: opts.confirmLabel ?? 'Да',
          cancelLabel: opts.cancelLabel ?? 'Отмена',
          alertOnly: false,
          ...opts,
        });
      },
      alert: async (messageOrOptions) => {
        const opts = normalize(messageOrOptions);
        await openDialog({
          title: opts.title ?? 'Сообщение',
          confirmLabel: opts.confirmLabel ?? 'OK',
          alertOnly: true,
          ...opts,
        });
      },
    }),
    [openDialog],
  );

  imperativeApi = api;

  const close = (value: boolean) => {
    setDialog((prev) => {
      if (!prev) return null;
      prev.resolve(value);
      openRef.current = false;
      return null;
    });
  };

  return (
    <AppDialogContext.Provider value={api}>
      {children}
      {dialog && (
        <div
          className="app-dialog-overlay"
          role="presentation"
          onClick={() => {
            if (!dialog.alertOnly) close(false);
          }}
        >
          <div
            className={`app-dialog ${dialog.danger ? 'app-dialog--danger' : ''}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`app-dialog-title-${dialog.id}`}
            aria-describedby={`app-dialog-msg-${dialog.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={`app-dialog-title-${dialog.id}`} className="app-dialog__title">
              {dialog.title}
            </h2>
            <p id={`app-dialog-msg-${dialog.id}`} className="app-dialog__message">
              {dialog.message}
            </p>
            <div className="app-dialog__actions">
              {!dialog.alertOnly && (
                <button
                  type="button"
                  className="app-dialog__btn app-dialog__btn--ghost"
                  onClick={() => close(false)}
                >
                  {dialog.cancelLabel ?? 'Отмена'}
                </button>
              )}
              <button
                type="button"
                className={`app-dialog__btn ${
                  dialog.danger ? 'app-dialog__btn--danger' : 'app-dialog__btn--primary'
                }`}
                autoFocus
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? (dialog.alertOnly ? 'OK' : 'Да')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
};
