from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "med_center_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.tasks", "app.tasks.bracelet_alert_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    beat_schedule={
        "import-hospital-documents-from-1c-hourly": {
            "task": "app.tasks.tasks.import_hospital_documents_from_1c",
            "schedule": 3600.0,
        },
        "check-bracelet-vitals": {
            "task": "app.tasks.bracelet_alert_tasks.check_bracelet_vitals_and_notify",
            "schedule": float(settings.BRACELET_ALERT_CHECK_INTERVAL_SEC),
        },
    },
)
