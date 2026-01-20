from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
import enum

from .base import BaseModel


class PatientStatus(str, enum.Enum):
    ACTIVE = "active"
    DISCHARGED = "discharged"
    TRANSFERRED = "transferred"
    TEMPORARY_ABSENT = "temporary_absent"


class Patient(BaseModel):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True, index=True)  # ID из 1С
    full_name = Column(String, nullable=False)
    birth_date = Column(DateTime)
    gender = Column(String)
    medical_record_number = Column(String, unique=True)
    admission_date = Column(DateTime, nullable=False)
    discharge_date = Column(DateTime)
    status = Column(Enum(PatientStatus), default=PatientStatus.ACTIVE, nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    bed = relationship("Bed", back_populates="patients")
    created_by_user = relationship("User", back_populates="created_patients", foreign_keys=[created_by])
    medical_records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan")