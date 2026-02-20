from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from .base import BaseModel
from enum import Enum as PyEnum

class UserRole(PyEnum):
    DOCTOR = "doctor"
    NURSE = "nurse"
    ADMIN = "admin"

class User(BaseModel):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.NURSE, nullable=False)

    created_patients = relationship("Patient", back_populates="created_by_user", foreign_keys="Patient.created_by")
    medical_records = relationship("MedicalRecord", back_populates="created_by_user")
    appointments = relationship("Appointment", back_populates="doctor")
    procedures = relationship("Procedure", back_populates="created_by_user")
    prescriptions = relationship("Prescription", back_populates="created_by_user")