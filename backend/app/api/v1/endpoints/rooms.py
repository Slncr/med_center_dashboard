from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.schemas.room import Room as RoomSchema
from app.crud.room import get_all_rooms_with_beds
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[RoomSchema])
async def get_rooms(db: Session = Depends(get_db)):
    rooms = get_all_rooms_with_beds(db)
    return rooms