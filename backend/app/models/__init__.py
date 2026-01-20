# Импортируем все модели
from .base import Base, BaseModel
from .user import User, UserRole
from .room import Room, Bed
from .patient import Patient, PatientStatus
from .medical import (
    MedicalRecord,
    Appointment,
    Procedure,
    ObservationType,
    ProcedureStatus
)

__all__ = [
    "Base",
    "BaseModel",
    "User",
    "UserRole",
    "Room",
    "Bed",
    "Patient",
    "PatientStatus",
    "MedicalRecord",
    "Appointment",
    "Procedure",
    "ObservationType",
    "ProcedureStatus",
]