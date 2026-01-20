from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Medical Center API", version="1.0.0")

# CORS для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели
class Bed(BaseModel):
    id: int
    number: int
    patient: str

class Room(BaseModel):
    id: int
    number: str
    beds: List[Bed]

# Мок данные
rooms_data = [
    {
        "id": 1,
        "number": "101",
        "beds": [
            {"id": 1, "number": 1, "patient": "Иванов Иван Иванович"},
            {"id": 2, "number": 2, "patient": "Петров Петр Петрович"}
        ]
    },
    {
        "id": 2,
        "number": "102",
        "beds": [
            {"id": 3, "number": 1, "patient": "Сидорова Мария Сергеевна"}
        ]
    }
]

@app.get("/")
async def root():
    return {"message": "Medical Center API", "status": "running"}

@app.get("/api/rooms", response_model=List[Room])
async def get_rooms():
    return rooms_data

@app.get("/api/rooms/{room_id}", response_model=Room)
async def get_room(room_id: int):
    for room in rooms_data:
        if room["id"] == room_id:
            return room
    return {"error": "Room not found"}

@app.post("/api/patient/{patient_id}/select")
async def select_patient(patient_id: int):
    return {
        "message": f"Пациент {patient_id} выбран",
        "success": True,
        "welcome_message": "Добро пожаловать в медицинский центр!"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
