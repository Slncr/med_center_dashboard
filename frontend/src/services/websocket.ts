// src/services/websocket.ts

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  sender?: string;
}

export interface WebSocketEventHandlers {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: (attempt: number) => void;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export enum WebSocketMessageType {
  PATIENT_SELECTED = 'patient_selected',
  PATIENT_UPDATED = 'patient_updated',
  PROCEDURE_UPDATED = 'procedure_updated',
  APPOINTMENT_UPDATED = 'appointment_updated',
  OBSERVATION_ADDED = 'observation_added',
  FORM_UPDATED = 'form_updated',
  PRINT_JOB_STATUS = 'print_job_status',
  SYNC_STATUS = 'sync_status',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat'
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private handlers: WebSocketEventHandlers = {};
  private config: WebSocketConfig;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      debug: false,
      ...config
    };
  }

  /**
   * Подключение к WebSocket серверу
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.log('WebSocket уже подключен');
      return;
    }

    try {
      this.log(`Подключение к WebSocket: ${this.config.url}`);
      this.socket = new WebSocket(this.config.url);

      this.setupEventListeners();
      
    } catch (error) {
      this.log(`Ошибка подключения: ${error}`);
      this.handleReconnect();
    }
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = (event: Event) => {
      this.log('WebSocket подключен');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      this.startHeartbeat();
      
      if (this.handlers.onOpen) {
        this.handlers.onOpen(event);
      }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.log('Получено сообщение:', message);
        
        // Обработка heartbeat
        if (message.type === WebSocketMessageType.HEARTBEAT) {
          this.log('Heartbeat получен');
          return;
        }
        
        if (this.handlers.onMessage) {
          this.handlers.onMessage(message);
        }
      } catch (error) {
        this.log('Ошибка парсинга сообщения:', error);
      }
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.log(`WebSocket закрыт. Код: ${event.code}, Причина: ${event.reason}`);
      this.isConnected = false;
      
      this.stopHeartbeat();
      
      if (this.handlers.onClose) {
        this.handlers.onClose(event);
      }
      
      this.handleReconnect();
    };

    this.socket.onerror = (event: Event) => {
      this.log('WebSocket ошибка:', event);
      this.isConnected = false;
      
      if (this.handlers.onError) {
        this.handlers.onError(event);
      }
    };
  }

  /**
   * Обработка переподключения
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.log('Достигнуто максимальное количество попыток переподключения');
      return;
    }

    this.reconnectAttempts++;
    const delay = (this.config.reconnectInterval || 5000) * this.reconnectAttempts;
    
    this.log(`Попытка переподключения ${this.reconnectAttempts} через ${delay}ms`);
    
    if (this.handlers.onReconnect) {
      this.handlers.onReconnect(this.reconnectAttempts);
    }
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Отправка сообщения
   */
  send(message: WebSocketMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Не удалось отправить сообщение: WebSocket не подключен');
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString()
      };
      
      this.socket.send(JSON.stringify(messageWithTimestamp));
      this.log('Сообщение отправлено:', messageWithTimestamp);
      return true;
    } catch (error) {
      this.log('Ошибка отправки сообщения:', error);
      return false;
    }
  }

  /**
   * Отправка heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: WebSocketMessageType.HEARTBEAT,
          data: { ping: Date.now() },
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.heartbeatInterval || 30000);
  }

  /**
   * Остановка heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Регистрация обработчиков событий
   */
  setHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Подписка на события пациента
   */
  subscribeToPatient(patientId: number): void {
    this.send({
      type: 'subscribe',
      data: { 
        channel: `patient:${patientId}`,
        patient_id: patientId 
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Подписка на события палаты
   */
  subscribeToRoom(roomId: number): void {
    this.send({
      type: 'subscribe',
      data: { 
        channel: `room:${roomId}`,
        room_id: roomId 
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Подписка на события пользователя
   */
  subscribeToUser(userId: number): void {
    this.send({
      type: 'subscribe',
      data: { 
        channel: `user:${userId}`,
        user_id: userId 
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Отписка от канала
   */
  unsubscribe(channel: string): void {
    this.send({
      type: 'unsubscribe',
      data: { channel },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Отключение от WebSocket
   */
  disconnect(): void {
    this.log('Отключение от WebSocket');
    
    if (this.socket) {
      this.socket.close(1000, 'Пользовательское отключение');
      this.socket = null;
    }
    
    this.stopHeartbeat();
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Получение статуса подключения
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Логирование
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  /**
   * Отправка сообщения о выборе пациента
   */
  sendPatientSelected(patientId: number, roomNumber: string, bedNumber: number): boolean {
    return this.send({
      type: WebSocketMessageType.PATIENT_SELECTED,
      data: {
        patient_id: patientId,
        room_number: roomNumber,
        bed_number: bedNumber,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Отправка сообщения об обновлении процедуры
   */
  sendProcedureUpdated(procedureId: number, patientId: number, status: string): boolean {
    return this.send({
      type: WebSocketMessageType.PROCEDURE_UPDATED,
      data: {
        procedure_id: procedureId,
        patient_id: patientId,
        status: status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Отправка сообщения о добавлении наблюдения
   */
  sendObservationAdded(observationId: number, patientId: number): boolean {
    return this.send({
      type: WebSocketMessageType.OBSERVATION_ADDED,
      data: {
        observation_id: observationId,
        patient_id: patientId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Создаем и экспортируем глобальный экземпляр WebSocketService
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export const websocketService = new WebSocketService({
  url: WS_URL,
  reconnectInterval: 3000,
  maxReconnectAttempts: 20,
  heartbeatInterval: 25000,
  debug: process.env.NODE_ENV === 'development'
});

export default websocketService;