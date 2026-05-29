import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { Patient, Room } from '../types';
import { SYNC_1C_INTERVAL_MS } from '../utils/constants';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPatients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPatients();
      if (mountedRef.current) setPatients(data);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки пациентов');
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiService.getRooms();
      if (mountedRef.current) setRooms(data);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки палат');
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(
    async (silent = false) => {
      await Promise.all([fetchPatients(silent), fetchRooms(silent)]);
    },
    [fetchPatients, fetchRooms],
  );

  const selectPatient = useCallback(async (patientId: number): Promise<boolean> => {
    try {
      await apiService.selectPatient(patientId);
      return true;
    } catch (err) {
      console.error('Error selecting patient:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    void refreshAll(false);

    const syncFrom1CAndRefresh = async () => {
      try {
        await apiService.syncWith1C();
      } catch {
        // Нет прав (врач) или 1С недоступна — обновим список из БД после серверного синка
      }
      if (mountedRef.current) {
        await refreshAll(true);
      }
    };

    const interval = setInterval(() => {
      void syncFrom1CAndRefresh();
    }, SYNC_1C_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshAll]);

  return {
    patients,
    rooms,
    loading,
    error,
    fetchPatients,
    fetchRooms,
    selectPatient,
    refetch: () => refreshAll(true),
  };
};
