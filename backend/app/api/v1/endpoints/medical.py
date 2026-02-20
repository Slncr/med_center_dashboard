from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_current_user
from app.core.database import get_db
from app.schemas.user import User

# ✅ Модели (SQLAlchemy) с алиасами
from app.models.medical import (
    Prescription as PrescriptionModel,  # Модель БД
    PrescriptionStatus,
    Procedure as ProcedureModel  # Модель БД для процедур
)

# ✅ Схемы (Pydantic) с алиасами
from app.schemas.medical import (
    Observation,
    ObservationCreate,
    ObservationUpdate,
    Procedure,          # Схема для ответа (Pydantic)
    ProcedureCreate,
    PrescriptionCreate,
    Prescription as PrescriptionSchema,  # Схема для ответа (Pydantic)
    PrescriptionExecution  # Новая схема для выполнения назначения
)

# ✅ CRUD функции
from app.crud.medical import (
    get_observations_by_patient,
    create_observation,
    update_observation_in_db,
    delete_observation_from_db,
    get_procedures_by_patient,
    update_procedure_status,
    create_procedure,
    get_appointments_by_patient
)

router = APIRouter(tags=["Medical"])

@router.get("/observations/{patient_id}", response_model=List[Observation])
async def get_observations(patient_id: int, db: Session = Depends(get_db)):
    observations = get_observations_by_patient(db, patient_id)
    return observations

@router.post("/observations", response_model=Observation)
async def add_observation(observation: ObservationCreate, db: Session = Depends(get_db), current_user= Depends(get_current_user)):
    return create_observation(db, observation, current_user.id)

@router.put("/observations/{observation_id}", response_model=Observation)
async def update_observation(
    observation_id: int,
    observation_update: ObservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return update_observation_in_db(db, observation_id, observation_update, current_user.id)

@router.delete("/observations/{observation_id}", response_model=dict)
async def delete_observation(
    observation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_observation_from_db(db, observation_id)
    return {"message": "Наблюдение успешно удалено"}

@router.get("/procedures/{patient_id}", response_model=List[Procedure])
async def get_procedures(patient_id: int, db: Session = Depends(get_db)):
    procedures = get_procedures_by_patient(db, patient_id)
    return procedures

@router.patch("/procedures/{procedure_id}/status", response_model=Procedure)
async def update_procedure_status_endpoint(
    procedure_id: int, status: str, db: Session = Depends(get_db)
):
    return update_procedure_status(db, procedure_id, status)

@router.post("/procedures", response_model=Procedure)
async def add_procedure(
    procedure: ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_procedure(db, procedure, user_id=current_user.id)

@router.get("/appointments/{patient_id}", response_model=List[dict])  # или создайте схему
async def get_appointments(patient_id: int, db: Session = Depends(get_db)):
    appointments = get_appointments_by_patient(db, patient_id)
    return appointments

# ✅ Создание назначения (только врач)
@router.post("/prescriptions", response_model=PrescriptionSchema)
async def create_prescription(
    prescription: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_prescription = PrescriptionModel(  # ✅ Используем модель БД
        patient_id=prescription.patient_id,
        created_by=current_user.id,
        prescription_type=prescription.prescription_type,
        name=prescription.name,
        frequency=prescription.frequency,
        dosage=prescription.dosage,
        notes=prescription.notes,
        start_date=prescription.start_date or datetime.utcnow(),
        end_date=prescription.end_date,
        status=PrescriptionStatus.ACTIVE
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription  # ✅ Автоматически конвертируется в схему

# ✅ Получение назначений пациента
@router.get("/prescriptions/patient/{patient_id}", response_model=List[PrescriptionSchema])
async def get_prescriptions_by_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prescriptions = db.query(PrescriptionModel).filter(  # ✅ Используем модель БД
        PrescriptionModel.patient_id == patient_id,
        PrescriptionModel.status != PrescriptionStatus.CANCELLED
    ).order_by(desc(PrescriptionModel.created_at)).all()
    return prescriptions  # ✅ Автоматически конвертируется в список схем

# ✅ Выполнение назначения (только медсестра)
@router.post("/prescriptions/{prescription_id}/execute", response_model=Procedure)
async def execute_prescription(
    prescription_id: int,
    execution_data: PrescriptionExecution,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prescription = db.query(PrescriptionModel).filter(
        PrescriptionModel.id == prescription_id
    ).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Назначение не найдено")
    
    if prescription.status != PrescriptionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Назначение уже выполнено или отменено")
    
    # Создаём запись в процедурах (фактическое выполнение)
    procedure = ProcedureModel(  # ✅ Используем модель БД
        patient_id=prescription.patient_id,
        created_by=current_user.id,
        name=prescription.name,
        description=f"Выполнено по назначению #{prescription.id}",
        scheduled_time=datetime.utcnow(),
        status="COMPLETED",  # ✅ ВЕРХНИЙ РЕГИСТР для перечисления в БД
        dosage=prescription.dosage,
        frequency=prescription.frequency,
        notes=execution_data.notes or prescription.notes
    )
    db.add(procedure)
    
    # Обновляем статус назначения
    prescription.status = PrescriptionStatus.COMPLETED
    prescription.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(procedure)
    return procedure  # ✅ Автоматически конвертируется в схему