from datetime import datetime
from celery import shared_task
from app.core.config import settings
from app.services.onec_service import OneCService
from app.services.mit_service import sync_with_1c
from app.crud.patient import get_patients_needing_sync, update_patient_sync_status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

logger = logging.getLogger(__name__)


def _get_task_db():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

@shared_task(bind=True, max_retries=3)
def import_hospital_documents_from_1c(self):
    """Импорт стационарных пациентов из 1С — по расписанию Celery Beat."""
    try:
        db = _get_task_db()
        result = sync_with_1c(db)
        db.close()
        logger.info("✅ Импорт из 1С: %s", result.get("message", result))
        return {"success": True, **result}
    except Exception as e:
        logger.error("🔥 Ошибка импорта из 1С: %s", e)
        raise self.retry(exc=e, countdown=300)


@shared_task(bind=True, max_retries=3)
def sync_patients_with_1c(self):
    """Фоновая синхронизация пациентов с 1С (БЕЗ вебсокетов!)"""
    try:
        db = _get_task_db()
        
        patients = get_patients_needing_sync(db)
        logger.info(f"Начата синхронизация {len(patients)} пациентов с 1С")
        
        onec_service = OneCService(settings.ONEC_BASE_URL or "")
        
        synced_count = 0
        for patient in patients:
            try:
                result = onec_service.sync_patient(patient)
                update_patient_sync_status(db, patient.id, result)
                logger.info(f"✅ Пациент {patient.id} синхронизирован")
                synced_count += 1
            except Exception as e:
                logger.error(f"❌ Ошибка синхронизации {patient.id}: {e}")
                update_patient_sync_status(db, patient.id, {"error": str(e), "success": False})
        
        db.close()
        logger.info(f"✅ Синхронизация завершена. Обработано: {synced_count}/{len(patients)}")
        return {"success": True, "synced_count": synced_count}
    
    except Exception as e:
        logger.error(f"🔥 Критическая ошибка: {e}")
        raise self.retry(exc=e, countdown=60)
