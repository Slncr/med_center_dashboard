from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.patient import Patient, PatientStatus

def get_all_active_patients(db: Session, patient_id: int = None):
    query = db.query(Patient).filter(Patient.status == PatientStatus.ACTIVE)
    if patient_id:
        query = query.filter(Patient.id == patient_id)
    return query.all()

def get_patient_by_id(db: Session, patient_id: int):
    return db.query(Patient).filter(Patient.id == patient_id).first()

def get_patient_by_external_id(db: Session, external_id: str):
    return db.query(Patient).filter(Patient.external_id == external_id).first()

def create_patient(
    db: Session,
    external_id: str,
    full_name: str,
    admission_date,
    discharge_date,
    status: str,
    bed_id: int,
    document_id: str,
    branch_id: str,
    department_id: str,
    department_name: str
):
    db_patient = Patient(
        external_id=external_id,
        full_name=full_name,
        admission_date=admission_date,
        discharge_date=discharge_date,
        status=status,
        bed_id=bed_id,
        document_id=document_id,
        branch_id=branch_id,
        department_id=department_id,
        department_name=department_name
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient
