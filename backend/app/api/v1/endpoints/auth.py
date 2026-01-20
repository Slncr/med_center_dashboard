from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# Модели для аутентификации
class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

# Мок пользователи для демо
fake_users_db = {
    "doctor": {
        "username": "doctor",
        "email": "doctor@example.com",
        "full_name": "Доктор Иванов",
        "role": "doctor",
        "password": "password123"
    },
    "nurse": {
        "username": "nurse",
        "email": "nurse@example.com",
        "full_name": "Медсестра Петрова",
        "role": "nurse",
        "password": "password123"
    }
}

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    """Простая аутентификация для демо"""
    user = fake_users_db.get(login_data.username)
    
    if not user or user["password"] != login_data.password:
        raise HTTPException(
            status_code=401,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # В реальном приложении здесь генерируется JWT токен
    return {
        "access_token": f"fake-jwt-token-for-{login_data.username}",
        "token_type": "bearer"
    }

@router.get("/users/me", response_model=User)
async def read_users_me(token: str = "demo"):
    """Получение информации о текущем пользователе"""
    # В реальном приложении здесь проверяется JWT токен
    # Для демо возвращаем пользователя doctor
    return {
        "username": "doctor",
        "email": "doctor@example.com",
        "full_name": "Доктор Иванов",
        "role": "doctor"
    }

@router.get("/test")
async def test_auth():
    """Тестовый endpoint для проверки работы"""
    return {"message": "Auth endpoint работает", "status": "ok"}
