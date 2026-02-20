from datetime import timedelta
from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.models.medical import MedicalRecord, Procedure as ProcedureModel
from app.schemas.medical import ObservationCreate, ObservationUpdate, ProcedureCreate

def get_observations_by_patient(db: Session, patient_id: int):
    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).order_by(desc(MedicalRecord.created_at)).all()
    # Преобразуем в Pydantic-объекты
    observations = []
    for rec in records:
        observations.append({
            "id": rec.id,
            "patient_id": rec.patient_id,
            "record_date": rec.record_date,
            "temperature": rec.temperature,
            "blood_pressure_systolic": rec.blood_pressure_systolic,
            "blood_pressure_diastolic": rec.blood_pressure_diastolic,
            "pulse": rec.pulse,
            "complaints": rec.complaints,
            "examination": rec.examination,
            "created_at": rec.created_at
        })
    return observations

def create_observation(db: Session, obs: ObservationCreate, user_id: int):
    from datetime import datetime
    moscow_now = datetime.utcnow() + timedelta(hours=3)
    record = MedicalRecord(
        patient_id=obs.patient_id,
        record_date=obs.record_date,
        temperature=obs.temperature,
        blood_pressure_systolic=obs.blood_pressure_systolic,
        blood_pressure_diastolic=obs.blood_pressure_diastolic,
        pulse=obs.pulse,
        respiration_rate=obs.respiration_rate,
        spO2=obs.spO2,
        weight=obs.weight,
        height=obs.height,
        complaints=obs.complaints,
        examination=obs.examination,
        diagnosis=obs.diagnosis,
        recommendations=obs.recommendations,
        created_by=user_id,
        created_at=moscow_now
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "record_date": record.record_date,
        "temperature": record.temperature,
        "blood_pressure_systolic": record.blood_pressure_systolic,
        "blood_pressure_diastolic": record.blood_pressure_diastolic,
        "pulse": record.pulse,
        "respiration_rate": record.respiration_rate,
        "spO2": record.spO2,
        "weight": record.weight,
        "height": record.height,
        "complaints": record.complaints,
        "examination": record.examination,
        "diagnosis": record.diagnosis,
        "recommendations": record.recommendations,
        "created_at": record.created_at
    }

def update_observation_in_db(
    db: Session, 
    observation_id: int, 
    obs_update: ObservationUpdate, 
    user_id: int
):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == observation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Observation not found")

    # Обновляем только те поля, которые переданы (включая None)
    for field, value in obs_update.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "record_date": record.record_date,
        "temperature": record.temperature,
        "blood_pressure_systolic": record.blood_pressure_systolic,
        "blood_pressure_diastolic": record.blood_pressure_diastolic,
        "pulse": record.pulse,
        "complaints": record.complaints,
        "examination": record.examination,
        "created_at": record.created_at
    }

def delete_observation_from_db(db: Session, observation_id: int):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == observation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Observation not found")
    db.delete(record)
    db.commit()

def get_procedures_by_patient(db: Session, patient_id: int):
    procedures = db.query(ProcedureModel).filter(ProcedureModel.patient_id == patient_id).all()
    return procedures

def update_procedure_status(db: Session, procedure_id: int, status: str):
    proc = db.query(ProcedureModel).filter(ProcedureModel.id == procedure_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Procedure not found")
    proc.status = status
    db.commit()
    db.refresh(proc)
    return proc

def create_procedure(db: Session, proc: ProcedureCreate, user_id: int):
    record = ProcedureModel(
        patient_id=proc.patient_id,
        name=proc.name,
        description=proc.description,
        scheduled_time=proc.scheduled_time,
        status=proc.status,
        created_by=user_id
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "name": record.name,
        "description": record.description,
        "scheduled_time": record.scheduled_time,
        "status": record.status,
        "created_by": record.created_by
    }

def get_appointments_by_patient(db: Session, patient_id: int):
    from app.models.medical import Appointment as AppointmentModel
    appointments = db.query(AppointmentModel).filter(AppointmentModel.patient_id == patient_id).all()
    return appointments