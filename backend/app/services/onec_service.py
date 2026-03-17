from datetime import datetime
import requests
from typing import Dict, Any
from app.models.patient import Patient
import logging

logger = logging.getLogger(__name__)

class OneCService:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.timeout = 30  # секунд
    
    def sync_patient(self, patient: Patient) -> Dict[str, Any]:
        """
        Синхронизировать пациента с 1С
        
        Возвращает:
            {
                "success": bool,
                "onec_id": str,
                "synced_at": str (ISO 8601),
                "errors": list[str] (опционально)
            }
        """
        if not self.base_url:
            raise ValueError("URL 1С не настроен (ONE_C_URL)")
        
        try:
            payload = {
                "external_id": patient.external_id or f"medcenter-{patient.id}",
                "full_name": patient.full_name,
                "birth_date": patient.birth_date,
                "gender": patient.gender,
                "medical_record_number": patient.medical_record_number,
                "admission_date": patient.admission_date.isoformat() if hasattr(patient.admission_date, 'isoformat') else str(patient.admission_date),
                "discharge_date": patient.discharge_date.isoformat() if patient.discharge_date and hasattr(patient.discharge_date, 'isoformat') else None,
                "status": patient.status,
                "bed_id": patient.bed_id,
                "department_name": patient.department_name
            }
            
            response = requests.post(
                f"{self.base_url}/api/patients/sync",
                json=payload,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"}
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Успешная синхронизация пациента {patient.id} с 1С. 1С ID: {result.get('onec_id')}")
            return {
                "success": True,
                "onec_id": result.get("onec_id"),
                "synced_at": result.get("synced_at") or datetime.utcnow().isoformat(),
                "errors": result.get("errors", [])
            }
            
        except requests.exceptions.Timeout:
            error_msg = f"Таймаут при синхронизации пациента {patient.id} с 1С"
            logger.error(error_msg)
            raise TimeoutError(error_msg)
            
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Ошибка подключения к 1С при синхронизации пациента {patient.id}: {e}"
            logger.error(error_msg)
            raise ConnectionError(error_msg)
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP ошибка 1С при синхронизации пациента {patient.id}: {e} - {e.response.text if e.response else ''}"
            logger.error(error_msg)
            raise
            
        except Exception as e:
            error_msg = f"Неизвестная ошибка при синхронизации пациента {patient.id}: {e}"
            logger.error(error_msg)
            raise