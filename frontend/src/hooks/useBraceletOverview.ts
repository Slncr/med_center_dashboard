import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import type { BraceletOverview } from '../types/braceletAlerts';

const OVERVIEW_POLL_MS = 30_000;

export function useBraceletOverview(enabled = true) {
  const [overview, setOverview] = useState<BraceletOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiService.getBraceletOverview();
      if (mountedRef.current) setOverview(data);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки браслетов');
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  const runCheckAndNotify = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      await apiService.checkBraceletAlerts();
      await fetchOverview(true);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Ошибка проверки');
      }
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, [fetchOverview]);

  const testMaxBot = useCallback(async () => {
    setError(null);
    try {
      await apiService.testBraceletMaxBot();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Ошибка отправки в MAX');
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    void fetchOverview(false);
    const interval = setInterval(() => void fetchOverview(true), OVERVIEW_POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, fetchOverview]);

  return {
    overview,
    loading,
    checking,
    error,
    refetch: () => fetchOverview(true),
    runCheckAndNotify,
    testMaxBot,
  };
}
