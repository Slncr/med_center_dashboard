from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str = "nurse"

class User(UserBase):
    id: int
    role: str
    is_active: bool

    class Config:
        from_attributes = True
