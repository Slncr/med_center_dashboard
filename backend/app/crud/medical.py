from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.medical import MedicalRecord, Procedure as ProcedureModel
from app.schemas.medical import ObservationCreate, ProcedureCreate

def get_observations_by_patient(db: Session, patient_id: int):
    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).all()
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
            "notes": rec.complaints or rec.examination,  # например
            "created_at": rec.created_at
        })
    return observations

def create_observation(db: Session, obs: ObservationCreate, user_id: int):
    record = MedicalRecord(
        patient_id=obs.patient_id,
        record_date=obs.record_date,
        temperature=obs.temperature,
        blood_pressure_systolic=obs.blood_pressure_systolic,
        blood_pressure_diastolic=obs.blood_pressure_diastolic,
        pulse=obs.pulse,
        complaints=obs.notes,
        created_by=user_id
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Возвращаем как Observation Pydantic-объект
    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "record_date": record.record_date,
        "temperature": record.temperature,
        "blood_pressure_systolic": record.blood_pressure_systolic,
        "blood_pressure_diastolic": record.blood_pressure_diastolic,
        "pulse": record.pulse,
        "notes": record.complaints,
        "created_at": record.created_at
    }

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

def get_appointments_by_patient(db: Session, patient_id: int):
    from app.models.medical import Appointment as AppointmentModel
    appointments = db.query(AppointmentModel).filter(AppointmentModel.patient_id == patient_id).all()
    return appointments