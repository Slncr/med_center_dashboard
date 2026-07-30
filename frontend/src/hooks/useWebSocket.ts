import { useEffect, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

const RECONNECT_MIN_MS = 2000;
const RECONNECT_MAX_MS = 30000;

type UseWebSocketOptions = {
  /** Комната без JWT (монитор операционной) */
  allowAnonymous?: boolean;
};

export const useWebSocket = (
  room: string,
  onMessage: (message: WebSocketMessage) => void,
  options: UseWebSocketOptions = {},
) => {
  const { allowAnonymous = false } = options;
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const attemptRef = useRef(0);
  const warnedRef = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    const token = localStorage.getItem('auth_token');
    if (!room) return undefined;
    if (!token && !allowAnonymous) return undefined;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${protocol}://${window.location.host}/api/v1/ws/${room}${qs}`;

    const clearReconnect = () => {
      if (reconnectTimerRef.current != null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (unmountedRef.current) return;
      clearReconnect();
      const attempt = attemptRef.current;
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_MIN_MS * Math.pow(2, Math.min(attempt, 4)),
      );
      attemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const connect = () => {
      if (unmountedRef.current) return;

      // не плодим сокеты
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        warnedRef.current = false;
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessageRef.current(message);
        } catch {
          // ignore malformed
        }
      };

      // Браузер всегда шлёт Event без полезного текста — не спамим консоль
      socket.onerror = () => {};

      socket.onclose = (event) => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (unmountedRef.current) return;
        // 1000 = нормальное закрытие с нашей стороны
        if (event.code === 1000) return;
        if (!warnedRef.current) {
          warnedRef.current = true;
          console.warn(`[ws] ${room}: disconnected, reconnecting…`);
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      clearReconnect();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.onopen = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, 'Component unmounted');
        }
      }
    };
  }, [room, allowAnonymous]);
};
