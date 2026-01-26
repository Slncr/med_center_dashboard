import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Patient, Room } from '../types';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPatients();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки пациентов');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getRooms();
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки палат');
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchRooms();
  }, [fetchRooms]);

  return {
    patients,
    rooms,
    loading,
    error,
    fetchPatients,
    fetchRooms,
    selectPatient,
    refetch: fetchRooms
  };
};