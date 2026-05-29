"""Отправка оповещений в чат MAX."""
from __future__ import annotations

import logging
from typing import List, Optional

import requests

from app.bracelet_alerts.types import PatientBraceletSnapshot, VitalAlert
from app.core.config import settings

logger = logging.getLogger(__name__)


class MaxBotNotifier:
    def __init__(
        self,
        token: Optional[str] = None,
        chat_id: Optional[int] = None,
        api_base: Optional[str] = None,
    ):
        self.token = (token or settings.MAX_BOT_TOKEN or "").strip()
        self.chat_id = chat_id if chat_id is not None else settings.MAX_ALERT_CHAT_ID
        base = (api_base or settings.MAX_API_BASE_URL or "https://platform-api.max.ru").rstrip("/")
        self.messages_url = f"{base}/messages"

    @property
    def is_configured(self) -> bool:
        return bool(self.token and self.chat_id)

    def send_text(self, text: str) -> bool:
        if not self.is_configured:
            logger.warning("MAX bot not configured (MAX_BOT_TOKEN / MAX_ALERT_CHAT_ID)")
            return False
        try:
            response = requests.post(
                self.messages_url,
                params={"chat_id": self.chat_id},
                headers={
                    "Authorization": self.token,
                    "Content-Type": "application/json",
                },
                json={"text": text[:4000], "notify": True, "format": "html"},
                timeout=settings.MAX_API_TIMEOUT,
            )
            response.raise_for_status()
            return True
        except Exception as exc:
            logger.error("MAX send failed: %s", exc)
            return False

    def format_alert_message(self, snapshot: PatientBraceletSnapshot, alert: VitalAlert) -> str:
        location_parts = []
        if snapshot.room_number:
            location_parts.append(f"палата {snapshot.room_number}")
        if snapshot.bed_number:
            location_parts.append(f"койка {snapshot.bed_number}")
        location = ", ".join(location_parts) if location_parts else "место не указано"

        level_emoji = "🔴" if alert.level.value == "critical" else "🟠"
        return (
            f"{level_emoji} <b>Браслет — отклонение показателя</b>\n"
            f"Пациент: {snapshot.patient_name}\n"
            f"{location}\n"
            f"Показатель: {alert.label} = {alert.value:g} {alert.unit}\n"
            f"Норма: {alert.normal_range}\n"
            f"{alert.message}"
        )

    def send_patient_alerts(self, snapshot: PatientBraceletSnapshot, alerts: List[VitalAlert]) -> int:
        sent = 0
        for alert in alerts:
            if self.send_text(self.format_alert_message(snapshot, alert)):
                sent += 1
        return sent
