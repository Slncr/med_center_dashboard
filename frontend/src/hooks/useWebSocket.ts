// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (room: string, onMessage: (message: WebSocketMessage) => void) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || !room) {
      console.error('❌ Нет токена или комнаты для вебсокета');
      return;
    }

    // ✅ Относительный путь — проксируется через /api/v1/ws
    // const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // const wsUrl = `${protocol}://${window.location.host}/api/v1/ws/${room}?token=${token}`;
    const wsUrl = `ws://localhost:8000/api/v1/ws/${room}?token=${token}`;

    console.log(`🔌 Подключение к вебсокету: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log(`✅ WS подключён к комнате: ${room}`);
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 WS message:', message);
        onMessage(message);
      } catch (e) {
        console.error('❌ Ошибка парсинга WS:', e);
      }
    };

    socket.onclose = (event) => {
      if (event.code !== 1000) {
        console.log(`⚠️ WS закрыт: ${event.code} ${event.reason || 'без причины'}`);
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WS ошибка:', error);
    };

    // ✅ Защита от утечек: закрываем ТОЛЬКО существующий сокет
    return () => {
      if (socketRef.current) {
        console.log('🧹 Очистка вебсокета');
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
    };
  }, [room, onMessage]);
};