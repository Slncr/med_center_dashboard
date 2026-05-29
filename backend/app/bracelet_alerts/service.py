"""Оркестрация проверки браслетов и отправки оповещений."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.bracelet_alerts.collector import collect_patient_snapshots
from app.bracelet_alerts.dedup_store import AlertDedupStore
from app.bracelet_alerts.max_notifier import MaxBotNotifier
from app.bracelet_alerts.types import CheckResult, PatientBraceletSnapshot, VitalAlert
from app.core.config import settings

logger = logging.getLogger(__name__)

LAST_CHECK_REDIS_KEY = "ble_alerts:last_check"


class BraceletAlertService:
    def __init__(
        self,
        notifier: Optional[MaxBotNotifier] = None,
        dedup: Optional[AlertDedupStore] = None,
    ):
        self.notifier = notifier or MaxBotNotifier()
        self.dedup = dedup or AlertDedupStore()
        self._enabled = settings.BRACELET_ALERTS_ENABLED

    def check_and_notify(self, db: Session, send_to_max: bool = True) -> CheckResult:
        checked_at = datetime.now(timezone.utc).isoformat()
        snapshots, monitoring_connected, monitoring_error = collect_patient_snapshots(db)

        alerts_found = 0
        alerts_sent = 0
        alerts_skipped = 0
        patients_with_ble = 0
        patients_online = 0

        for snap in snapshots:
            if snap.ble_mac:
                patients_with_ble += 1
            if snap.online:
                patients_online += 1

            for alert in snap.alerts:
                alerts_found += 1
                if not self._enabled or not send_to_max:
                    continue
                if not self.notifier.is_configured:
                    continue
                if not self.dedup.should_send(snap.patient_id, alert.metric, alert.level.value, alert.value):
                    alerts_skipped += 1
                    continue
                if self._send_single_alert(snap, alert):
                    self.dedup.mark_sent(snap.patient_id, alert.metric, alert.level.value, alert.value)
                    alerts_sent += 1

        result = CheckResult(
            checked_at=checked_at,
            patients_total=len(snapshots),
            patients_with_ble=patients_with_ble,
            patients_online=patients_online,
            alerts_found=alerts_found,
            alerts_sent=alerts_sent,
            alerts_skipped_dedup=alerts_skipped,
            monitoring_connected=monitoring_connected,
            error=monitoring_error,
            snapshots=snapshots,
        )
        self._store_last_check(result)
        return result

    def _send_single_alert(self, snapshot: PatientBraceletSnapshot, alert: VitalAlert) -> bool:
        text = self.notifier.format_alert_message(snapshot, alert)
        return self.notifier.send_text(text)

    def _store_last_check(self, result: CheckResult) -> None:
        try:
            import redis

            client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            payload = {
                "checked_at": result.checked_at,
                "alerts_found": result.alerts_found,
                "alerts_sent": result.alerts_sent,
                "monitoring_connected": result.monitoring_connected,
            }
            client.setex(LAST_CHECK_REDIS_KEY, 86400, json.dumps(payload, ensure_ascii=False))
        except Exception as exc:
            logger.debug("Could not store last check: %s", exc)

    def get_overview(self, db: Session) -> CheckResult:
        """Только сбор данных без отправки в MAX."""
        return self.check_and_notify(db, send_to_max=False)
