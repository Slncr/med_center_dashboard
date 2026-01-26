from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class ObservationBase(BaseModel):
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    notes: Optional[str] = None

class ObservationCreate(ObservationBase):
    patient_id: int
    record_date: date

class Observation(ObservationBase):
    id: int
    patient_id: int
    record_date: date
    created_at: datetime

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True  

class ProcedureBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "scheduled"

class ProcedureCreate(ProcedureBase):
    patient_id: int
    scheduled_time: datetime

class Procedure(ProcedureBase):
    id: int
    patient_id: int
    scheduled_time: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
