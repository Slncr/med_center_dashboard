// src/hooks/useWebSocket.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketMessage } from '../types/websocket';
import { WS_EVENTS } from '../utils/constants';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export interface UseWebSocketOptions {
  clientId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts: number;
}

// Старая сигнатура для обратной совместимости
export const useWebSocket = (
  clientId?: string, 
  handleWebSocketMessage?: (message: WebSocketMessage) => void,
  options?: Partial<UseWebSocketOptions>
) => {
  // Нормализуем параметры для поддержки старой и новой сигнатуры
  const normalizedOptions: UseWebSocketOptions = {
    clientId: clientId || 'frontend',
    onMessage: handleWebSocketMessage,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 20,
    ...options
  };

  const {
    clientId: finalClientId,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect,
    reconnectInterval,
    maxReconnectAttempts
  } = normalizedOptions;

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket уже подключен или подключается');
      return;
    }

    const wsUrl = finalClientId ? `${WS_URL}/${finalClientId}` : WS_URL;
    console.log(`Подключение к WebSocket: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket подключен');
      setIsConnected(true);
      setReconnectAttempt(0);
      
      if (onConnect) {
        onConnect();
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket отключен:', event.code, event.reason);
      setIsConnected(false);
      
      if (onDisconnect) {
        onDisconnect();
      }
      
      // Автоматическое переподключение
      if (autoConnect && reconnectAttempt < maxReconnectAttempts) {
        const attempt = reconnectAttempt + 1;
        setReconnectAttempt(attempt);
        console.log(`Попытка переподключения ${attempt} через ${reconnectInterval}ms`);
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
      setIsConnected(false);
      
      if (onError) {
        onError(error);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('Получено WebSocket сообщение:', message);
        
        // Сохраняем последние 50 сообщений
        setMessages(prev => [...prev.slice(-49), message]);
        
        if (onMessage) {
          onMessage(message);
        }

        // Обработка специфичных событий
        switch (message.type) {
          case WS_EVENTS.PATIENT_SELECTED:
            console.log('Пациент выбран:', message.data);
            break;
          
          case WS_EVENTS.PROCEDURE_UPDATED:
            console.log('Процедура обновлена:', message.data);
            break;
            
          case WS_EVENTS.OBSERVATION_ADDED:
            console.log('Наблюдение добавлено:', message.data);
            break;
            
          case WS_EVENTS.PRINT_JOB_STATUS:
            console.log('Статус печати:', message.data);
            break;
            
          case WS_EVENTS.SYNC_STATUS:
            console.log('Статус синхронизации:', message.data);
            break;
            
          case WS_EVENTS.HEARTBEAT:
            // Отвечаем на heartbeat
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: WS_EVENTS.HEARTBEAT,
                data: { pong: Date.now() },
                timestamp: new Date().toISOString()
              }));
            }
            break;
        }
      } catch (err) {
        console.error('Ошибка парсинга WebSocket сообщения:', err, event.data);
      }
    };

    wsRef.current = ws;
  }, [finalClientId, onMessage, onConnect, onDisconnect, onError, autoConnect, reconnectInterval, maxReconnectAttempts, reconnectAttempt]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Пользовательское отключение');
      wsRef.current = null;
      setIsConnected(false);
      setReconnectAttempt(0);
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: new Date().toISOString()
        };
        wsRef.current.send(JSON.stringify(messageWithTimestamp));
        console.log('WebSocket сообщение отправлено:', messageWithTimestamp);
        return true;
      } catch (error) {
        console.error('Ошибка отправки WebSocket сообщения:', error);
        return false;
      }
    } else {
      console.warn('WebSocket не подключен, сообщение не отправлено:', message);
      return false;
    }
  }, []);

  // Функция для отправки события выбора пациента
  const sendPatientSelected = useCallback((patientId: number, roomNumber: string, bedNumber: number) => {
    return sendMessage({
      type: WS_EVENTS.PATIENT_SELECTED,
      data: {
        patient_id: patientId,
        room_number: roomNumber,
        bed_number: bedNumber,
        client_id: finalClientId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      event: 'patient_selected'
    });
  }, [sendMessage, finalClientId]);

  // Функция для отправки обновления процедуры
  const sendProcedureUpdated = useCallback((procedureId: number, patientId: number, status: string) => {
    return sendMessage({
      type: WS_EVENTS.PROCEDURE_UPDATED,
      data: {
        procedure_id: procedureId,
        patient_id: patientId,
        status: status,
        client_id: finalClientId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      event: 'patient_selected'
    });
  }, [sendMessage, finalClientId]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  return {
    isConnected,
    messages,
    reconnectAttempt,
    sendMessage,
    sendPatientSelected,
    sendProcedureUpdated,
    connect,
    disconnect
  };
};

// Экспортируем также опциональный объектный вариант
export const useWebSocketObject = (options: UseWebSocketOptions = {
  maxReconnectAttempts: 0
}) => {
  return useWebSocket(options.clientId, options.onMessage, options);
};