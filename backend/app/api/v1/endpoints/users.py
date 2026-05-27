from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app import crud, schemas
from app.crud.user import get_user_by_username, get_user_by_email
from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User as UserModel, UserRole

router = APIRouter(tags=["Users"])

@router.get("/me", response_model=schemas.User)
async def read_users_me(current_user: UserModel = Depends(get_current_user)):
    """Получить информацию о текущем пользователе"""
    return current_user

@router.get("/", response_model=List[schemas.User])
async def get_users(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить список всех пользователей (только для админа)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = crud.get_users(db)
    # Исключаем других админов из списка для безопасности
    return [user for user in users if user.role != UserRole.ADMIN]

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: schemas.user.UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Зарегистрировать нового пользователя (только для админа)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can register users")
    
    # # Проверка уникальности логина
    # if crud.get_user_by_username(db, username=user_in.username):
    #     raise HTTPException(status_code=400, detail="Username already registered")
    
    # # Проверка уникальности email
    # if crud.get_user_by_email(db, email=user_in.email):
    #     raise HTTPException(status_code=400, detail="Email already registered")
    
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = crud.create_user(db, user_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already registered")
    return user