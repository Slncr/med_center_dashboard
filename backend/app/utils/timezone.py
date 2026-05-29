"""Время для отображения в интерфейсе (Москва, UTC+3)."""
from datetime import datetime, timedelta, timezone

MSK = timezone(timedelta(hours=3))


def now_moscow() -> datetime:
    return datetime.now(MSK)


def to_moscow(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(MSK)


def format_time_moscow(dt: datetime | None) -> str | None:
    msk = to_moscow(dt)
    if msk is None:
        return None
    return msk.strftime("%H:%M")
