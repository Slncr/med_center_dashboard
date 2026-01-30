from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.schemas.patient import Patient  # Убедитесь, что Pydantic-схема Patient определена
from app.crud.patient import get_all_active_patients
from app.core.database import get_db

router = APIRouter()

@router.get("/", response_model=List[Patient])
async def get_patients(db: Session = Depends(get_db)):
    patients = get_all_active_patients(db)
    return patients

@router.get("/{patient_id}", response_model=Patient)
async def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = get_all_active_patients(db, patient_id=patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.post("/{patient_id}/select")
async def select_patient(patient_id: int):
    # Пока оставим как заглушка, можно реализовать позже
    return {"message": f"Patient {patient_id} selected", "success": True}