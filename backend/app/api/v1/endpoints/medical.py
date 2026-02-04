from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_current_user

from app.schemas.medical import Observation, ObservationCreate, Procedure, ProcedureCreate
from app.crud.medical import (
    get_observations_by_patient,
    create_observation,
    get_procedures_by_patient,
    update_procedure_status,
    get_appointments_by_patient
)
from app.core.database import get_db

router = APIRouter(prefix="/medical", tags=["Medical"])

@router.get("/observations/{patient_id}", response_model=List[Observation])
async def get_observations(patient_id: int, db: Session = Depends(get_db)):
    observations = get_observations_by_patient(db, patient_id)
    return observations

@router.post("/observations", response_model=Observation)
async def add_observation(observation: ObservationCreate, db: Session = Depends(get_db), current_user= Depends(get_current_user)):
    return create_observation(db, observation, current_user.id)

@router.get("/procedures/{patient_id}", response_model=List[Procedure])
async def get_procedures(patient_id: int, db: Session = Depends(get_db)):
    procedures = get_procedures_by_patient(db, patient_id)
    return procedures

@router.patch("/procedures/{procedure_id}/status", response_model=Procedure)
async def update_procedure_status_endpoint(
    procedure_id: int, status: str, db: Session = Depends(get_db)
):
    return update_procedure_status(db, procedure_id, status)

@router.get("/appointments/{patient_id}", response_model=List[dict])  # или создайте схему
async def get_appointments(patient_id: int, db: Session = Depends(get_db)):
    appointments = get_appointments_by_patient(db, patient_id)
    return appointments