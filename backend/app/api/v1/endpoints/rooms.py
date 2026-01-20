from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

# Модели
class Bed(BaseModel):
    id: int
    number: int
    patient: str
    patient_id: int

class Room(BaseModel):
    id: int
    number: str
    beds: List[Bed]

# Мок данные
mock_rooms = [
    {
        "id": 1,
        "number": "101",
        "beds": [
            {"id": 1, "number": 1, "patient": "Иванов И.И.", "patient_id": 1},
            {"id": 2, "number": 2, "patient": "Петров П.П.", "patient_id": 2}
        ]
    },
    {
        "id": 2,
        "number": "102",
        "beds": [
            {"id": 3, "number": 1, "patient": "Сидорова М.С.", "patient_id": 3}
        ]
    }
]

@router.get("/", response_model=List[Room])
async def get_rooms():
    return mock_rooms

@router.get("/{room_id}", response_model=Room)
async def get_room(room_id: int):
    for room in mock_rooms:
        if room["id"] == room_id:
            return room
    return {"error": "Room not found"}
