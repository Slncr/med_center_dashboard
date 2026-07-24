import { useEffect, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

const RECONNECT_MS = 2000;

export const useWebSocket = (
  room: string,
  onMessage: (message: WebSocketMessage) => void
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    unmountedRef.current = false;
    const token = localStorage.getItem('auth_token');
    if (!token || !room) {
      return undefined;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/v1/ws/${room}?token=${encodeURIComponent(token)}`;

    const clearReconnect = () => {
      if (reconnectTimerRef.current != null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (unmountedRef.current) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log(`WS connected: ${room}`);
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessageRef.current(message);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      socket.onerror = (error) => {
        console.error('WS error:', error);
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (unmountedRef.current) return;
        console.warn(`WS closed: ${room}, reconnect in ${RECONNECT_MS}ms`);
        clearReconnect();
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_MS);
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      clearReconnect();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
    };
  }, [room]);
};
