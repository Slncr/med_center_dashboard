import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import {
  DEFAULT_OR_STATUS,
  isOrStatus,
  OrStatus,
} from '../utils/operatingRoomStatus';

const POLL_MS = 2500;

/** Статус операционной: HTTP + WS (poll — запасной канал, если WS нестабилен). */
export function useOperatingRoomStatus(): {
  status: OrStatus;
  setStatusOptimistic: (status: OrStatus) => void;
  saveStatus: (status: OrStatus) => Promise<void>;
} {
  const [status, setStatus] = useState<OrStatus>(DEFAULT_OR_STATUS);

  const applyRemote = useCallback((value: unknown) => {
    if (isOrStatus(value)) {
      setStatus(value);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      apiService
        .getOperatingRoomStatus()
        .then((data) => {
          if (!cancelled) applyRemote(data.status);
        })
        .catch(() => {
          /* silent — poll продолжит */
        });
    };

    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyRemote]);

  const onWsMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'or_status_changed') {
        applyRemote(message.status);
      }
    },
    [applyRemote],
  );

  useWebSocket('or', onWsMessage, { allowAnonymous: true });

  const setStatusOptimistic = useCallback((next: OrStatus) => {
    setStatus(next);
  }, []);

  const saveStatus = useCallback(async (next: OrStatus) => {
    const updated = await apiService.setOperatingRoomStatus(next);
    applyRemote(updated.status);
  }, [applyRemote]);

  return { status, setStatusOptimistic, saveStatus };
}
