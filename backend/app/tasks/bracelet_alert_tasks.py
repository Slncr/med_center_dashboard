"""Фоновая проверка показателей браслетов."""
from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

from app.bracelet_alerts.service import BraceletAlertService
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_task_db():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


@shared_task(bind=True, max_retries=2)
def check_bracelet_vitals_and_notify(self):
    """Периодическая проверка браслетов и оповещение в MAX."""
    if not settings.BRACELET_ALERTS_ENABLED:
        return {"skipped": True, "reason": "disabled"}
    db = _get_task_db()
    try:
        service = BraceletAlertService()
        result = service.check_and_notify(db, send_to_max=True)
        logger.info(
            "Bracelet check: alerts=%s sent=%s skipped=%s",
            result.alerts_found,
            result.alerts_sent,
            result.alerts_skipped_dedup,
        )
        return {
            "success": True,
            "alerts_found": result.alerts_found,
            "alerts_sent": result.alerts_sent,
            "alerts_skipped_dedup": result.alerts_skipped_dedup,
        }
    except Exception as exc:
        logger.error("Bracelet alert task failed: %s", exc)
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
