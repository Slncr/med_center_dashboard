from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.schemas.user import Token, User, UserCreate
from app.crud.user import authenticate_user, create_user, get_user_by_username
from app.deps import create_access_token, get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session

from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str
    
router = APIRouter(tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login_for_access_token(
    login_request: LoginRequest,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, login_request.username, login_request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=dict)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Проверим, существует ли пользователь
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    created_user = create_user(db, user)
    return {"message": "User created successfully", "user_id": created_user.id}