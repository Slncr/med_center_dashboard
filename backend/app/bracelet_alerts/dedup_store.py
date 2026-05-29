"""Подавление повторных оповещений по одному показателю."""
from __future__ import annotations

import logging
from typing import Optional

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class AlertDedupStore:
    def __init__(self, redis_url: Optional[str] = None, cooldown_seconds: Optional[int] = None):
        self.cooldown_seconds = cooldown_seconds or settings.BRACELET_ALERT_COOLDOWN_SEC
        self._client: Optional[redis.Redis] = None
        url = redis_url or settings.REDIS_URL
        try:
            self._client = redis.from_url(url, decode_responses=True)
            self._client.ping()
        except Exception as exc:
            logger.warning("Redis dedup unavailable, alerts may repeat: %s", exc)
            self._client = None

    def _key(self, patient_id: int, metric: str, level: str) -> str:
        return f"ble_alert:{patient_id}:{metric}:{level}"

    def should_send(self, patient_id: int, metric: str, level: str, value: float) -> bool:
        if not self._client:
            return True
        key = self._key(patient_id, metric, level)
        stored = self._client.get(key)
        if stored is not None and stored == str(value):
            return False
        return True

    def mark_sent(self, patient_id: int, metric: str, level: str, value: float) -> None:
        if not self._client:
            return
        key = self._key(patient_id, metric, level)
        self._client.setex(key, self.cooldown_seconds, str(value))
