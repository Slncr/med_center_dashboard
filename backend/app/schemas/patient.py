from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Patient(BaseModel):
    id: int
    full_name: str
    birth_date: Optional[datetime] = None
    gender: Optional[str] = None
    medical_record_number: Optional[str] = None
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    status: str
    bed_id: Optional[int] = None
    created_by: Optional[int] = None
    external_id: Optional[str] = None

    # Поля из 1С
    document_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True