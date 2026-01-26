from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

router = APIRouter()

# Модели для формы 530н
class Observation(BaseModel):
    patient_id: int
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    notes: Optional[str] = None
    date: date

class Procedure(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "scheduled"

# Мок данные наблюдений
mock_observations = [
    {
        "patient_id": 1,
        "temperature": 36.6,
        "blood_pressure_systolic": 120,
        "blood_pressure_diastolic": 80,
        "pulse": 72,
        "notes": "Состояние удовлетворительное",
        "date": "2024-01-15"
    },
    {
        "patient_id": 1,
        "temperature": 37.0,
        "blood_pressure_systolic": 125,
        "blood_pressure_diastolic": 85,
        "pulse": 75,
        "notes": "Легкая температура",
        "date": "2024-01-16"
    }
]

@router.get("/observations/{patient_id}")
async def get_observations(patient_id: int):
    """Получение наблюдений по пациенту"""
    patient_obs = [obs for obs in mock_observations if obs["patient_id"] == patient_id]
    return patient_obs

@router.post("/observations")
async def add_observation(observation: Observation):
    """Добавление нового наблюдения"""
    # В реальном приложении здесь сохраняем в БД
    mock_observations.append(observation.dict())
    return {
        "message": "Наблюдение добавлено",
        "observation": observation.dict(),
        "total_observations": len(mock_observations)
    }

@router.get("/procedures/{patient_id}")
async def get_procedures(patient_id: int):
    """Получение процедур по пациенту"""
    # Мок данные процедур
    mock_procedures = [
        {
            "id": 1,
            "patient_id": patient_id,
            "name": "Измерение температуры",
            "description": "Утреннее измерение",
            "status": "completed",
            "time": "08:00"
        },
        {
            "id": 2,
            "patient_id": patient_id,
            "name": "Прием лекарств",
            "description": "Антибиотики",
            "status": "scheduled",
            "time": "12:00"
        }
    ]
    return mock_procedures

@router.post("/procedures/{patient_id}/complete/{procedure_id}")
async def complete_procedure(patient_id: int, procedure_id: int):
    """Отметка о выполнении процедуры"""
    return {
        "message": f"Процедура {procedure_id} отмечена как выполненная",
        "patient_id": patient_id,
        "procedure_id": procedure_id,
        "status": "completed"
    }

@router.get("/form-530n/{patient_id}")
async def get_form_530n(patient_id: int):
    """Получение данных для формы 530н"""
    return {
        "patient_id": patient_id,
        "form_name": "Форма 530н",
        "observations": mock_observations,
        "procedures": [
            {"name": "Ежедневный осмотр", "status": "required"},
            {"name": "Ведение температуры", "status": "required"}
        ],
        "last_updated": "2024-01-17 10:30:00"
    }
