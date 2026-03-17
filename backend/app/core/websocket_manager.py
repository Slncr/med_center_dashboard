# app/core/websocket_manager.py
from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)
        logger.info(f"WS connected to room {room_id}")
    
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
    
    async def broadcast(self, message: dict, room_id: str):
        """Отправить сообщение ВСЕМ в комнате"""
        if room_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_text(json.dumps(message, ensure_ascii=False))
                except Exception:
                    disconnected.add(connection)
            
            for conn in disconnected:
                self.active_connections[room_id].discard(conn)

manager = ConnectionManager()  # Единственный глобальный экземпляр