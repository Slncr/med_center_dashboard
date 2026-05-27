from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session
from typing import List, Optional

from app.deps import get_current_user, require_auth_or_public_display
from app.core.database import get_db
from app.schemas.user import User
from app.core.websocket_manager import manager


# ✅ Модели (SQLAlchemy) с алиасами
from app.models.medical import (
    Prescription as PrescriptionModel,
    PrescriptionStatus,
    Procedure as ProcedureModel,
    ProcedureStatus,
)

# ✅ Схемы (Pydantic) с алиасами
from app.models.patient import Patient
from app.models.user import UserRole
from sqlalchemy.orm import joinedload

from app.schemas.form_530n import Form530nResponse
from app.services.form_530n_service import build_form_530n, render_form_530n_html
from app.schemas.medical import (
    Observation,
    ObservationCreate,
    ObservationUpdate,
    Procedure,          # Схема для ответа (Pydantic)
    ProcedureCreate,
    PrescriptionCreate,
    PrescriptionsBatchCreate,
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


class ProcedureStatusUpdate(BaseModel):
    status: str


@router.get("/observations/{patient_id}", response_model=List[Observation])
async def get_observations(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
async def get_procedures(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    procedures = get_procedures_by_patient(db, patient_id)
    return procedures


@router.patch("/procedures/{procedure_id}/status", response_model=Procedure)
async def update_procedure_status_endpoint(
    procedure_id: int,
    body: ProcedureStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_procedure_status(db, procedure_id, body.status)


@router.patch("/procedures/{procedure_id}", response_model=Procedure)
async def update_procedure_status_compat(
    procedure_id: int,
    body: ProcedureStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_procedure_status(db, procedure_id, body.status)

@router.post("/procedures", response_model=Procedure)
async def add_procedure(
    procedure: ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_procedure(db, procedure, user_id=current_user.id)

@router.get("/appointments/{patient_id}", response_model=List[dict])
async def get_appointments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointments = get_appointments_by_patient(db, patient_id)
    return appointments


@router.post("/appointments")
async def create_appointment_stub(current_user: User = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Appointment creation not implemented yet")

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


@router.post("/prescriptions/batch", response_model=List[PrescriptionSchema])
async def create_prescriptions_batch(
    body: PrescriptionsBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.prescriptions:
        raise HTTPException(status_code=400, detail="Список назначений пуст")

    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    created: List[PrescriptionModel] = []
    for item in body.prescriptions:
        db_prescription = PrescriptionModel(
            patient_id=body.patient_id,
            created_by=current_user.id,
            prescription_type=item.prescription_type,
            name=item.name,
            frequency=item.frequency,
            dosage=item.dosage,
            notes=item.notes,
            start_date=item.start_date or datetime.utcnow(),
            end_date=item.end_date,
            status=item.status or PrescriptionStatus.ACTIVE,
        )
        db.add(db_prescription)
        created.append(db_prescription)

    db.commit()
    for p in created:
        db.refresh(p)

    await manager.broadcast(
        {
            "type": "prescriptions_created",
            "patient_id": body.patient_id,
            "patient_name": patient.full_name,
            "count": len(created),
            "prescription_ids": [p.id for p in created],
            "created_at": datetime.utcnow().isoformat(),
            "created_by": current_user.full_name,
        },
        "nurse",
    )
    return created


# ✅ Получение назначений пациента
@router.get("/prescriptions/patient/{patient_id}", response_model=List[PrescriptionSchema])
async def get_prescriptions_by_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(require_auth_or_public_display),
):
    prescriptions = db.query(PrescriptionModel).filter(  # ✅ Используем модель БД
        PrescriptionModel.patient_id == patient_id,
        # PrescriptionModel.status != PrescriptionStatus.CANCELLED
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
        status=ProcedureStatus.COMPLETED,
        dosage=prescription.dosage,
        frequency=prescription.frequency,
        notes=execution_data.notes or prescription.notes
    )
    await manager.broadcast(
        {
            "type": "prescription_completed",
            "prescription_id": prescription_id,
            "patient_name": prescription.patient.full_name,
            "prescription_name": prescription.name,
            "completed_by": current_user.full_name,
            "timestamp": datetime.utcnow().isoformat()
        },
        "nurse"  # Или конкретная станция
    )
    db.add(procedure)
    
    # Обновляем статус назначения
    prescription.status = PrescriptionStatus.COMPLETED
    prescription.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(procedure)
    return procedure

@router.patch("/prescriptions/{prescription_id}/cancel", response_model=PrescriptionSchema)
async def cancel_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отменить активное назначение. Врач — только свои."""
    prescription = (
        db.query(PrescriptionModel)
        .options(joinedload(PrescriptionModel.patient))
        .filter(PrescriptionModel.id == prescription_id)
        .first()
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Назначение не найдено")

    if prescription.status == PrescriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Назначение уже отменено")

    if prescription.status == PrescriptionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Нельзя отменить выполненное назначение")

    if current_user.role == UserRole.DOCTOR and prescription.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Можно отменить только свои назначения")

    prescription.status = PrescriptionStatus.CANCELLED
    prescription.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(prescription)

    patient_name = prescription.patient.full_name if prescription.patient else ""
    await manager.broadcast(
        {
            "type": "prescription_cancelled",
            "prescription_id": prescription.id,
            "patient_id": prescription.patient_id,
            "patient_name": patient_name,
            "prescription_name": prescription.name,
            "cancelled_by": current_user.full_name,
        },
        "nurse",
    )
    return prescription


@router.get("/form-530n/{patient_id}", response_model=Form530nResponse)
async def get_form_530n(
    patient_id: int,
    date_from: Optional[date] = Query(None, description="Начало периода (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Конец периода (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return build_form_530n(db, patient_id, date_from, date_to)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/form-530n/{patient_id}/print", response_class=HTMLResponse)
async def print_form_530n(
    patient_id: int,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = build_form_530n(db, patient_id, date_from, date_to)
        html = render_form_530n_html(data)
        return HTMLResponse(content=html)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
