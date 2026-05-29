from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum

class PatientStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISCHARGED = "DISCHARGED"

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
    bed_id = Column(Integer, ForeignKey("beds.id"))  # Связь с койкой
    created_by = Column(Integer, ForeignKey("users.id"))

    # Добавим поля из 1С
    document_id = Column(String)  # Документ из 1С
    branch_id = Column(String)    # Филиал из 1С
    department_id = Column(String)  # Подразделение из 1С
    department_name = Column(String)  # Название подразделения
    ble_mac = Column(String, index=True)  # MAC браслета без двоеточий
    vital_threshold_overrides = Column(JSON, nullable=True)  # Персональные пороги pulse/spo2

    # Особенности пациента (флажки на экране палаты)
    flag_white = Column(Boolean, default=False, nullable=False)
    flag_yellow = Column(Boolean, default=False, nullable=False)
    flag_red = Column(Boolean, default=False, nullable=False)
    flag_orange = Column(Boolean, default=False, nullable=False)
    flag_green = Column(Boolean, default=False, nullable=False)

    # Связи
    bed = relationship("Bed", back_populates="patients")
    created_by_user = relationship("User", back_populates="created_patients", foreign_keys=[created_by])
    medical_records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    prescription_packages = relationship(
        "PrescriptionPackage",
        back_populates="patient",
        cascade="all, delete-orphan",
    )