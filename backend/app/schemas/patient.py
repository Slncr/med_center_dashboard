from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientBase(BaseModel):
    full_name: str
    external_id: Optional[str] = None

class PatientCreate(PatientBase):
    bed_id: Optional[int] = None

class Patient(PatientBase):
    id: int
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    status: str
    bed_id: Optional[int] = None

    class Config:
        from_attributes = True
