from pydantic import BaseModel
from typing import List, Optional, Union
from .patient import Patient

class Bed(BaseModel):
    id: int
    number: Union[str, int]
    patient: Optional[Patient] = None

class Room(BaseModel):
    id: int
    number: str
    beds: List[Bed]


class RoomDisplayBinding(BaseModel):
    client_ip: str
    device_id: Optional[str] = None
    room_id: Optional[int] = None
    bound: bool = False
    source: str = "none"  # device | ip | none