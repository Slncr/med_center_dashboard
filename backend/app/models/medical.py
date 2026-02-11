from datetime import datetime
from sqlalchemy import Boolean, Column, Enum as SQLEnum, Integer, String, Float, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from .base import BaseModel
from .patient import Patient
from .user import User
from enum import Enum as PyEnum

class ProcedureStatus(PyEnum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MedicalRecord(BaseModel):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    record_date = Column(Date, nullable=False)
    temperature = Column(Float)
    blood_pressure_systolic = Column(Integer)
    blood_pressure_diastolic = Column(Integer)
    pulse = Column(Integer)
    respiration_rate = Column(Integer)
    spO2 = Column(Integer)
    weight = Column(Float)
    height = Column(Float)
    complaints = Column(Text)
    examination = Column(Text)
    diagnosis = Column(Text)
    recommendations = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="medical_records")
    created_by_user = relationship("User", back_populates="medical_records")

class Appointment(BaseModel):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(DateTime)
    status = Column(SQLEnum(ProcedureStatus), default=ProcedureStatus.SCHEDULED, nullable=False)
    notes = Column(Text)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", back_populates="appointments")

class Procedure(BaseModel):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))  # ✅ Добавьте это

    name = Column(String, nullable=False)
    description = Column(Text)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(SQLEnum(ProcedureStatus), default=ProcedureStatus.SCHEDULED, nullable=False)
    completed_at = Column(DateTime)
    notes = Column(Text)
    dosage = Column(String)
    frequency = Column(String)
    duration = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


    # Связи
    patient = relationship("Patient", back_populates="procedures")
    created_by_user = relationship("User", back_populates="procedures")