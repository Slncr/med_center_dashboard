from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.models.patient import Patient as PatientModel, PatientStatus
from app.schemas.patient import Patient as PatientSchema, PatientFeatureFlagsUpdate
from app.core.database import get_db
from app.deps import get_current_user, require_auth_or_public_display
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[PatientSchema])
async def get_patients(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(require_auth_or_public_display),
):
    """Получить всех активных пациентов"""
    patients = db.query(PatientModel).filter(PatientModel.status == PatientStatus.ACTIVE).all()
    return patients

@router.get("/archived", response_model=List[PatientSchema])  # ✅ Сначала этот
async def get_archived_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список архивных пациентов"""
    patients = db.query(PatientModel).filter(PatientModel.status == PatientStatus.DISCHARGED).all()
    return patients

@router.post("/{patient_id}/select")
async def select_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Выбор пациента для отображения на планшете палаты."""
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "patient_id": patient.id,
        "full_name": patient.full_name,
        "bed_id": patient.bed_id,
        "message": "Patient selected",
    }


@router.get("/{patient_id}", response_model=PatientSchema)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить пациента по ID"""
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.patch("/{patient_id}/archive", response_model=PatientSchema)
async def archive_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Выписать пациента и отправить в архив"""
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.status = PatientStatus.DISCHARGED
    patient.discharge_date = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return patient

@router.patch("/{patient_id}/feature-flags", response_model=PatientSchema)
async def update_patient_feature_flags(
    patient_id: int,
    body: PatientFeatureFlagsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить особенности пациента (флажки на экране палаты)."""
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.flag_white = body.flag_white
    patient.flag_yellow = body.flag_yellow
    patient.flag_red = body.flag_red
    patient.flag_orange = body.flag_orange
    patient.flag_green = body.flag_green
    db.commit()
    db.refresh(patient)
    return patient


@router.patch("/{patient_id}/restore", response_model=PatientSchema)
async def restore_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Вернуть пациента из архива"""
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.status = PatientStatus.ACTIVE
    patient.discharge_date = None
    db.commit()
    db.refresh(patient)
    return patient