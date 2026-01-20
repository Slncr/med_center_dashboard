from sqlalchemy import Column, Integer, String, Enum, Boolean
from sqlalchemy.orm import relationship
import enum

from .base import BaseModel


class UserRole(str, enum.Enum):
    NURSE = "nurse"
    DOCTOR = "doctor"
    ADMIN = "admin"


class User(BaseModel):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.NURSE, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    created_patients = relationship("Patient", back_populates="created_by_user", foreign_keys="Patient.created_by")
    medical_records = relationship("MedicalRecord", back_populates="created_by_user")
    appointments = relationship("Appointment", back_populates="doctor")