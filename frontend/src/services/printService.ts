// src/services/printService.ts

import { apiService } from './api';
import { Procedure, ProcedureStatus, Observation } from '../types';
import { ApiResponse } from '../types/api';

export interface PrintOptions {
  format?: 'pdf' | 'html' | 'docx';
  orientation?: 'portrait' | 'landscape';
  includeSignatures?: boolean;
  includeWatermark?: boolean;
  watermarkText?: string;
}

export interface PrintJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

export interface PrintForm530nOptions extends PrintOptions {
  includeObservations?: boolean;
  includeProcedures?: boolean;
  includeAppointments?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export class PrintService {
  /**
   * Печать формы 530н для пациента
   */
  static async printForm530n(
    patientId: number, 
    options: PrintForm530nOptions = {}
  ): Promise<Blob> {
    try {
      // Получаем данные формы
      const formData = await apiService.getForm530n(patientId);
      
      // Запрашиваем печать с сервера
      const response = await apiService.printForm530n(patientId);
      
      // Создаем Blob для скачивания
      return new Blob([response], { type: 'application/pdf' });
      
    } catch (error) {
      console.error('Ошибка при печати формы 530н:', error);
      throw new Error('Не удалось сгенерировать форму для печати');
    }
  }

  /**
   * Скачивание файла
   */
  static downloadFile(blob: Blob, filename: string = 'form-530n.pdf'): void {
    // Создаем ссылку для скачивания
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Просмотр файла в новом окне
   */
  static viewFile(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Очистка памяти будет выполнена после закрытия окна
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }

  /**
   * Генерация отчета по наблюдениям
   */
  static async printObservationsReport(
    patientId: number,
    startDate: string,
    endDate: string,
    options: PrintOptions = {}
  ): Promise<Blob> {
    try {
      // Получаем наблюдения - это Observation[]
      const observations = await apiService.getObservations(patientId);
      
      // Фильтруем по дате
      const filteredObservations = observations.filter(obs => {
        const obsDate = new Date(obs.record_date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return obsDate >= start && obsDate <= end;
      });

      // Формируем данные для печати
      const printData = {
        patientId,
        startDate,
        endDate,
        observations: filteredObservations,
        options
      };

      // Отправляем запрос на печать
      const response = await fetch('/api/v1/print/report/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiService.getToken()}`
        },
        body: JSON.stringify(printData)
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации отчета');
      }

      return await response.blob();
      
    } catch (error) {
      console.error('Ошибка при печати отчета:', error);
      throw error;
    }
  }

  /**
   * Генерация отчета по процедурам
   */
  static async printProceduresReport(
    patientId: number,
    status?: ProcedureStatus,
    options: PrintOptions = {}
  ): Promise<Blob> {
    try {
      // Получаем процедуры - это ApiResponse<Procedure[]>
      const proceduresResponse = await apiService.getProcedures(patientId);
      
      // Проверяем успешность и извлекаем данные
      const procedures: Procedure[] = proceduresResponse.success && proceduresResponse.data 
        ? proceduresResponse.data 
        : [];
      
      // Фильтруем по статусу если нужно
      const filteredProcedures = status 
        ? procedures.filter((proc: Procedure) => proc.status === status)
        : procedures;

      // Формируем данные для печати
      const printData = {
        patientId,
        status,
        procedures: filteredProcedures,
        options
      };

      // Отправляем запрос на печать
      const response = await fetch('/api/v1/print/report/procedures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiService.getToken()}`
        },
        body: JSON.stringify(printData)
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации отчета по процедурам');
      }

      return await response.blob();
      
    } catch (error) {
      console.error('Ошибка при печати отчета по процедурам:', error);
      throw error;
    }
  }

  /**
   * Печать карты пациента
   */
  static async printPatientCard(patientId: number): Promise<Blob> {
    try {
      const patient = await apiService.getPatient(patientId);
      
      const response = await fetch('/api/v1/print/patient-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiService.getToken()}`
        },
        body: JSON.stringify({ patient })
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации карты пациента');
      }

      return await response.blob();
      
    } catch (error) {
      console.error('Ошибка при печати карты пациента:', error);
      throw error;
    }
  }

  /**
   * Создание задания на печать в фоне
   */
  static async createPrintJob(
    patientId: number,
    printType: 'form530n' | 'observations' | 'procedures' | 'patient-card',
    options?: any
  ): Promise<PrintJob> {
    try {
      const response = await fetch('/api/v1/print/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiService.getToken()}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          print_type: printType,
          options
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка создания задания на печать');
      }

      return await response.json();
      
    } catch (error) {
      console.error('Ошибка создания задания на печать:', error);
      throw error;
    }
  }

  /**
   * Получение статуса задания на печать
   */
  static async getPrintJobStatus(jobId: string): Promise<PrintJob> {
    try {
      const response = await fetch(`/api/v1/print/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка получения статуса задания');
      }

      return await response.json();
      
    } catch (error) {
      console.error('Ошибка получения статуса задания:', error);
      throw error;
    }
  }

  /**
   * Получение всех заданий на печать для пользователя
   */
  static async getPrintJobs(): Promise<PrintJob[]> {
    try {
      const response = await fetch('/api/v1/print/jobs', {
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка получения списка заданий');
      }

      return await response.json();
      
    } catch (error) {
      console.error('Ошибка получения списка заданий:', error);
      throw error;
    }
  }
}

// Экспортируем singleton экземпляр
export const printService = new PrintService();
export default printService;