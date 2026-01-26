from sqlalchemy import Boolean, Column, Enum, Integer, String, Float, Text, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
import enum

from .base import BaseModel


class ObservationType(str, enum.Enum):
    TEMPERATURE = "temperature"
    BLOOD_PRESSURE = "blood_pressure"
    PULSE = "pulse"
    RESPIRATION = "respiration"
    WEIGHT = "weight"
    HEIGHT = "height"
    OTHER = "other"


class ProcedureStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MedicalRecord(BaseModel):
    __tablename__ = "medical_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    record_date = Column(Date, nullable=False)
    temperature = Column(Float)  # температура
    blood_pressure_systolic = Column(Integer)  # систолическое давление
    blood_pressure_diastolic = Column(Integer)  # диастолическое давление
    pulse = Column(Integer)  # пульс
    respiration_rate = Column(Integer)  # частота дыхания
    spO2 = Column(Integer)  # сатурация
    weight = Column(Float)  # вес
    height = Column(Float)  # рост
    complaints = Column(Text)  # жалобы
    examination = Column(Text)  # объективный осмотр
    diagnosis = Column(Text)  # диагноз
    recommendations = Column(Text)  # рекомендации
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
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
    status = Column(Enum(ProcedureStatus), default=ProcedureStatus.SCHEDULED, nullable=False)
    notes = Column(Text)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)
    
    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", back_populates="appointments")


class Procedure(BaseModel):
    __tablename__ = "procedures"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(Enum(ProcedureStatus), default=ProcedureStatus.SCHEDULED, nullable=False)
    completed_at = Column(DateTime)
    notes = Column(Text)
    dosage = Column(String)  # дозировка
    frequency = Column(String)  # периодичность
    duration = Column(String)  # длительность
    
    # Relationships
    patient = relationship("Patient", back_populates="procedures")