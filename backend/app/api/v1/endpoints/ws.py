# app/api/v1/endpoints/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_db
from app.core.websocket_manager import manager
from app.models.user import User
from app.crud.user import get_user, get_user_by_username  # ✅ Правильный импорт — функция называется get_user
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_current_user_ws(websocket: WebSocket, db: Session):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return None
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if username is None:
            await websocket.close(code=1008)
            return None
    except JWTError:
        await websocket.close(code=1008)
        return None
    
    user = get_user_by_username(db, username)
    if user is None:
        await websocket.close(code=1008)
        return None
    
    return user

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, db: Session = Depends(get_db)):
    print("WS ATTEMPT")
    user = await get_current_user_ws(websocket, db)
    if not user:
        return
    
    await manager.connect(websocket, room_id)
    
    try:
        # ✅ Отправляем приветствие через сам вебсокет
        await websocket.send_text(
            json.dumps({
                "type": "connected",
                "user": user.full_name,
                "role": user.role.value,
                "room": room_id
            }, ensure_ascii=False)
        )
        
        while True:
            data = await websocket.receive_text()
            logger.debug(f"WS message from {user.username}: {data[:100]}")
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        logger.info(f"WS disconnected: {user.username} from room {room_id}")