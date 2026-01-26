from fastapi import APIRouter
from app.api.v1.endpoints import auth, patients, rooms, medical, users, ws

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(medical.router, prefix="/medical", tags=["medical"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])