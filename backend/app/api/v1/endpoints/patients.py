from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

# Модели
class Patient(BaseModel):
    id: int
    full_name: str
    bed_id: int
    room_number: str

class PatientSelect(BaseModel):
    patient_id: int

# Мок данные
mock_patients = [
    {"id": 1, "full_name": "Иванов Иван Иванович", "bed_id": 1, "room_number": "101"},
    {"id": 2, "full_name": "Петров Петр Петрович", "bed_id": 2, "room_number": "101"},
    {"id": 3, "full_name": "Сидорова Мария Сергеевна", "bed_id": 1, "room_number": "102"},
]

@router.get("/", response_model=List[Patient])
async def get_patients():
    return mock_patients

@router.get("/{patient_id}", response_model=Patient)
async def get_patient(patient_id: int):
    for patient in mock_patients:
        if patient["id"] == patient_id:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")

@router.post("/{patient_id}/select")
async def select_patient(patient_id: int):
    for patient in mock_patients:
        if patient["id"] == patient_id:
            return {"message": f"Patient {patient['full_name']} selected", "success": True}
    raise HTTPException(status_code=404, detail="Patient not found")
