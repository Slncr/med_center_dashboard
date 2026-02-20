from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

from app.models.medical import PrescriptionStatus, PrescriptionType

class ObservationBase(BaseModel):
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    respiration_rate: Optional[int] = None      # ✅
    spO2: Optional[int] = None                  # ✅
    weight: Optional[float] = None              # ✅
    height: Optional[float] = None              # ✅
    complaints: Optional[str] = None
    examination: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None

class ObservationCreate(ObservationBase):
    patient_id: int
    record_date: date
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    respiration_rate: Optional[int] = None
    spO2: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None

class ObservationUpdate(ObservationBase):
    # Все поля опциональны
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    complaints: Optional[str] = None
    examination: Optional[str] = None

    class Config:
        from_attributes = True

class Observation(ObservationBase):
    id: int
    patient_id: int
    record_date: date
    created_at: datetime

    class Config:
        from_attributes = True

class ProcedureBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "scheduled"
    scheduled_time: datetime

class ProcedureCreate(ProcedureBase):
    patient_id: int
    name: str
    description: Optional[str] = None
    scheduled_time: datetime
    status: str = "scheduled"
    frequency: Optional[str] = None
    dosage: Optional[str] = None
    duration: Optional[str] = None

class Procedure(ProcedureBase):
    id: int
    patient_id: int
    scheduled_time: datetime
    created_by: int 
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HospitalDocument(BaseModel):
    document: str
    branch: str
    room: str
    room_name: str
    client: str
    client_name: str
    bed: str
    bed_name: str
    start_date: str
    end_date: str
    department: str
    department_name: str

class HospitalDocumentsResponse(BaseModel):
    documents: List[HospitalDocument]


class PrescriptionBase(BaseModel):
    prescription_type: PrescriptionType
    name: str
    frequency: Optional[str] = None
    dosage: Optional[str] = None
    notes: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[PrescriptionStatus] = PrescriptionStatus.ACTIVE

class PrescriptionCreate(PrescriptionBase):
    patient_id: int

class Prescription(PrescriptionBase):
    id: int
    patient_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class PrescriptionExecution(BaseModel):
    notes: Optional[str] = None