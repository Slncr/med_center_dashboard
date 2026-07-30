import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import {
  DEFAULT_OR_STATUS,
  isOrStatus,
  OrStatus,
} from '../utils/operatingRoomStatus';
import type {
  OrAnnouncement,
  OrAtmosphereConfig,
  OrAtmosphereView,
  OrBoard,
  OrDisplaySettings,
  OrStatsView,
} from '../types/operatingRoom';

const CONFIG_POLL_MS = 3000;
const BOARD_POLL_MS = 10000;
const ATM_POLL_MS = 5000;

const DEFAULT_DISPLAY: OrDisplaySettings = {
  show_stats: true,
  show_atmosphere: true,
  show_announcements: true,
};

const DEFAULT_ATMOSPHERE_CONFIG: OrAtmosphereConfig = {
  source: 'manual',
  monitor_zone: null,
  temp: null,
  hum: null,
  press: null,
};

const DEFAULT_STATS: OrStatsView = {
  active_patients: 0,
  awaiting_examination: 0,
  active_prescriptions: 0,
  completed_prescriptions: 0,
  ready_for_discharge: 0,
};

type OrConfigSnapshot = {
  status: OrStatus;
  updated_at: string | null;
  display: OrDisplaySettings;
  announcements: OrAnnouncement[];
  atmosphere_config: OrAtmosphereConfig;
  atmosphere?: OrAtmosphereView | null;
};

function hasAtmValues(atm: OrAtmosphereView | null | undefined): boolean {
  if (!atm) return false;
  return atm.temp != null || atm.hum != null || atm.press != null;
}

export function formatApiError(err: unknown, fallback: string): string {
  const detail = (err as any)?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg : JSON.stringify(item)))
      .join('; ');
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return fallback;
}

/**
 * Состояние OR:
 * - /config — статус, объявления, тумблеры
 * - /atmosphere — датчики (sticky: пустой ответ не стирает последние значения)
 * - /board — только stats на инфоэкране
 */
export function useOperatingRoomBoard(options?: { withStats?: boolean }) {
  const withStats = options?.withStats ?? false;
  const [status, setStatus] = useState<OrStatus>(DEFAULT_OR_STATUS);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [display, setDisplay] = useState<OrDisplaySettings>(DEFAULT_DISPLAY);
  const [announcements, setAnnouncements] = useState<OrAnnouncement[]>([]);
  const [atmosphereConfig, setAtmosphereConfig] =
    useState<OrAtmosphereConfig>(DEFAULT_ATMOSPHERE_CONFIG);
  const [atmosphere, setAtmosphere] = useState<OrAtmosphereView | null>(null);
  const [atmosphereError, setAtmosphereError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrStatsView>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const configInflight = useRef(false);
  const boardInflight = useRef(false);
  const atmInflight = useRef(false);
  const atmosphereRef = useRef<OrAtmosphereView | null>(null);
  const atmosphereConfigRef = useRef(atmosphereConfig);

  atmosphereRef.current = atmosphere;
  atmosphereConfigRef.current = atmosphereConfig;

  /** Обновляем atmosphere только если пришли реальные цифры (или явный manual). */
  const setAtmosphereSticky = useCallback(
    (next: OrAtmosphereView | null | undefined, opts?: { allowClear?: boolean }) => {
      if (hasAtmValues(next)) {
        setAtmosphere(next!);
        return;
      }
      if (opts?.allowClear) {
        setAtmosphere(null);
      }
      // иначе оставляем предыдущие значения — без мигания «—»
    },
    [],
  );

  const applyRemoteConfig = useCallback(
    (config: OrConfigSnapshot) => {
      const nextStatus = isOrStatus(config.status) ? config.status : DEFAULT_OR_STATUS;
      const nextDisplay = config.display ?? DEFAULT_DISPLAY;
      const nextAnnouncements = config.announcements ?? [];
      const nextAtmConfig = config.atmosphere_config ?? DEFAULT_ATMOSPHERE_CONFIG;

      setStatus(nextStatus);
      setUpdatedAt(config.updated_at);
      setDisplay(nextDisplay);
      setAnnouncements(nextAnnouncements);
      setAtmosphereConfig(nextAtmConfig);

      if (nextAtmConfig.source === 'manual') {
        setAtmosphereSticky(config.atmosphere, { allowClear: true });
        setAtmosphereError(null);
      }
      // sensor: atmosphere только из /atmosphere|/board с цифрами
    },
    [setAtmosphereSticky],
  );

  const refreshConfig = useCallback(async () => {
    const config = await apiService.getOperatingRoomConfig();
    applyRemoteConfig(config as OrConfigSnapshot);
    return config;
  }, [applyRemoteConfig]);

  const refreshAtmosphere = useCallback(async () => {
    const data = await apiService.getOperatingRoomAtmosphere();
    setAtmosphereConfig(data.atmosphere_config);
    setAtmosphereSticky(data.atmosphere);
    setAtmosphereError(data.atmosphere_error);
    return data;
  }, [setAtmosphereSticky]);

  const refresh = useCallback(async () => {
    const config = await refreshConfig();
    try {
      await refreshAtmosphere();
    } catch {
      /* keep sticky */
    }
    if (withStats) {
      try {
        const board = await apiService.getOperatingRoomBoard();
        applyRemoteConfig(board);
        setStats(board.stats ?? DEFAULT_STATS);
        setAtmosphereSticky(board.atmosphere);
        if (board.atmosphere_error) setAtmosphereError(board.atmosphere_error);
        return board;
      } catch {
        return config;
      }
    }
    return config;
  }, [applyRemoteConfig, refreshAtmosphere, refreshConfig, setAtmosphereSticky, withStats]);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      if (configInflight.current) return;
      configInflight.current = true;
      try {
        const config = await apiService.getOperatingRoomConfig();
        if (!cancelled) applyRemoteConfig(config as OrConfigSnapshot);
      } catch {
        /* next poll */
      } finally {
        configInflight.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    void loadConfig();
    const timer = window.setInterval(() => void loadConfig(), CONFIG_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyRemoteConfig]);

  useEffect(() => {
    let cancelled = false;

    const loadAtm = async () => {
      if (atmInflight.current) return;
      const cfg = atmosphereConfigRef.current;
      if (cfg.source !== 'sensor') return;
      if (cfg.monitor_zone == null) {
        setAtmosphereError('Не задана зона датчиков атмосферы');
        return;
      }

      // Смена зоны — не показываем чужие цифры
      const prev = atmosphereRef.current;
      if (prev?.zone != null && prev.zone !== cfg.monitor_zone) {
        setAtmosphere(null);
      }

      atmInflight.current = true;
      try {
        const data = await apiService.getOperatingRoomAtmosphere();
        if (cancelled) return;
        setAtmosphereSticky(data.atmosphere);
        setAtmosphereError(data.atmosphere_error);
      } catch {
        if (!cancelled) {
          setAtmosphereError('Не удалось обновить данные атмосферы');
        }
      } finally {
        atmInflight.current = false;
      }
    };

    void loadAtm();
    const timer = window.setInterval(() => void loadAtm(), ATM_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [atmosphereConfig.monitor_zone, atmosphereConfig.source, setAtmosphereSticky]);

  useEffect(() => {
    if (!withStats) return undefined;
    let cancelled = false;

    const loadBoard = async () => {
      if (boardInflight.current) return;
      boardInflight.current = true;
      try {
        const board = await apiService.getOperatingRoomBoard();
        if (cancelled) return;
        // stats всегда; atmosphere — только если есть цифры (не затираем sticky)
        setStats(board.stats ?? DEFAULT_STATS);
        setAtmosphereSticky(board.atmosphere);
        if (board.atmosphere_error != null) {
          setAtmosphereError(board.atmosphere_error);
        }
        // конфиг/статус/объявления тоже подтянем, без очистки atm
        applyRemoteConfig(board);
      } catch {
        /* stats optional */
      } finally {
        boardInflight.current = false;
      }
    };

    void loadBoard();
    const timer = window.setInterval(() => void loadBoard(), BOARD_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyRemoteConfig, setAtmosphereSticky, withStats]);

  const onWsMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'or_status_changed' && isOrStatus(message.status)) {
        setStatus(message.status);
        if (typeof message.updated_at === 'string' || message.updated_at === null) {
          setUpdatedAt(message.updated_at ?? null);
        }
      }
      if (message.type === 'or_board_changed') {
        applyRemoteConfig({
          status: message.status,
          updated_at: message.updated_at ?? null,
          display: message.display ?? DEFAULT_DISPLAY,
          announcements: message.announcements ?? [],
          atmosphere_config: message.atmosphere_config ?? DEFAULT_ATMOSPHERE_CONFIG,
          atmosphere: message.atmosphere,
        });
        if (message.atmosphere_config?.source === 'sensor') {
          void apiService
            .getOperatingRoomAtmosphere()
            .then((data) => {
              setAtmosphereSticky(data.atmosphere);
              setAtmosphereError(data.atmosphere_error);
            })
            .catch(() => undefined);
        } else if (hasAtmValues(message.atmosphere)) {
          setAtmosphereSticky(message.atmosphere);
        }
      }
    },
    [applyRemoteConfig, setAtmosphereSticky],
  );

  useWebSocket('or', onWsMessage, { allowAnonymous: true });

  return {
    status,
    updatedAt,
    display,
    announcements,
    atmosphereConfig,
    atmosphere,
    atmosphereError,
    stats,
    loading,
    refresh,
    refreshConfig,
    refreshAtmosphere,
    setStatus,
    setDisplay,
    setAnnouncements,
    setAtmosphereConfig,
    setAtmosphere,
    setAtmosphereError,
  };
}
