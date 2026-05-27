from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Form530nPatientInfo(BaseModel):
    id: int
    full_name: str
    birth_date: Optional[datetime] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_record_number: Optional[str] = None
    admission_date: Optional[datetime] = None
    department_name: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None


class Form530nObservationRow(BaseModel):
    id: int
    record_date: date
    record_time: Optional[str] = None
    temperature: Optional[float] = None
    pulse: Optional[int] = None
    blood_pressure: Optional[str] = None
    respiration_rate: Optional[int] = None
    spO2: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    complaints: Optional[str] = None
    examination: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None


class Form530nPrescriptionItem(BaseModel):
    id: int
    name: str
    prescription_type: str
    frequency: Optional[str] = None
    status: str


class Form530nProcedureItem(BaseModel):
    id: int
    name: str
    status: str
    scheduled_time: Optional[datetime] = None
    notes: Optional[str] = None


class Form530nResponse(BaseModel):
    form_code: str = "530/н"
    form_title: str = "Лист учёта температуры и других показателей состояния больного"
    patient: Form530nPatientInfo
    period_from: date
    period_to: date
    generated_at: datetime
    observations: List[Form530nObservationRow] = Field(default_factory=list)
    prescriptions: List[Form530nPrescriptionItem] = Field(default_factory=list)
    procedures: List[Form530nProcedureItem] = Field(default_factory=list)
    observations_count: int = 0
