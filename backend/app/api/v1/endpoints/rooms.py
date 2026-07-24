from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.room import Room as RoomSchema, RoomDisplayBinding
from app.crud.room import get_all_rooms_with_beds
from app.core.database import get_db
from app.deps import require_auth_or_public_display
from app.models.user import User
from app.services.room_display_binding import resolve_room_id_for_client

router = APIRouter()


@router.get("/display-binding", response_model=RoomDisplayBinding)
async def get_room_display_binding(
    request: Request,
    device_id: Optional[str] = None,
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    """
    Привязка монитора палаты.

    Приоритет: ``device_id`` (localStorage планшета) → IP клиента.
    Серийный номер планшета из браузера недоступен.
    """
    client_ip, resolved_device, room_id, source = resolve_room_id_for_client(
        request, device_id=device_id
    )
    return RoomDisplayBinding(
        client_ip=client_ip,
        device_id=resolved_device,
        room_id=room_id,
        bound=room_id is not None,
        source=source,
    )


@router.get("/", response_model=List[RoomSchema])
async def get_rooms(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    rooms = get_all_rooms_with_beds(db)
    return rooms