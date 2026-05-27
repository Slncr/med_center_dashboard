import { useEffect, useRef } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (
  room: string,
  onMessage: (message: WebSocketMessage) => void
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || !room) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/v1/ws/${room}?token=${token}`;

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

    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
    };
  }, [room]);
};
