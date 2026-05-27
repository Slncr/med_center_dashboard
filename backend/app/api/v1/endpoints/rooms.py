from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.room import Room as RoomSchema
from app.crud.room import get_all_rooms_with_beds
from app.core.database import get_db
from app.deps import require_auth_or_public_display
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[RoomSchema])
async def get_rooms(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    rooms = get_all_rooms_with_beds(db)
    return rooms