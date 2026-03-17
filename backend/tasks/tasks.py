from datetime import datetime
from celery import shared_task
from app.core.config import settings
from app.services.onec_service import OneCService
from app.crud.patient import get_patients_needing_sync, update_patient_sync_status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def sync_patients_with_1c(self):
    """Фоновая синхронизация пациентов с 1С (БЕЗ вебсокетов!)"""
    try:
        # Создаём отдельную сессию для задачи
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Получаем пациентов для синхронизации
        patients = get_patients_needing_sync(db)
        logger.info(f"Начата синхронизация {len(patients)} пациентов с 1С")
        
        # Инициализируем сервис 1С
        onec_service = OneCService(settings.ONE_C_URL)
        
        # Синхронизируем пациентов
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