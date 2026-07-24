from __future__ import annotations

from typing import Dict, Optional

from fastapi import Request

from app.core.config import settings


def parse_ip_room_map(raw: str) -> Dict[str, int]:
    """Формат: ``192.168.0.44=4,192.168.0.45=5`` (IP → room_id в БД)."""
    result: Dict[str, int] = {}
    for part in raw.split(","):
        part = part.strip()
        if not part or "=" not in part:
            continue
        ip, room_id_raw = part.split("=", 1)
        ip = ip.strip()
        try:
            result[ip] = int(room_id_raw.strip())
        except ValueError:
            continue
    return result


def parse_device_room_map(raw: str) -> Dict[str, int]:
    """Формат: ``uuid-устройства=4,другой-uuid=5`` (device_id → room_id)."""
    result: Dict[str, int] = {}
    for part in raw.split(","):
        part = part.strip()
        if not part or "=" not in part:
            continue
        device_id, room_id_raw = part.split("=", 1)
        device_id = device_id.strip()
        if not device_id:
            continue
        try:
            result[device_id] = int(room_id_raw.strip())
        except ValueError:
            continue
    return result


def normalize_ip(ip: str) -> str:
    value = ip.strip()
    if value.startswith("::ffff:"):
        return value[7:]
    return value


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return normalize_ip(forwarded.split(",")[0])
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return normalize_ip(real_ip)
    if request.client:
        return normalize_ip(request.client.host)
    return ""


def resolve_room_id_for_client(
    request: Request,
    device_id: Optional[str] = None,
) -> tuple[str, Optional[str], Optional[int], str]:
    """
    Возвращает ``(client_ip, device_id, room_id, source)``.

    Приоритет: device_id map → IP map.
    ``source``: ``device`` | ``ip`` | ``none``.
    """
    client_ip = get_client_ip(request)
    normalized_device = (device_id or "").strip() or None

    if normalized_device:
        by_device = parse_device_room_map(settings.ROOM_DISPLAY_DEVICE_ROOM_MAP).get(
            normalized_device
        )
        if by_device is not None:
            return client_ip, normalized_device, by_device, "device"

    by_ip = parse_ip_room_map(settings.ROOM_DISPLAY_IP_ROOM_MAP).get(client_ip)
    if by_ip is not None:
        return client_ip, normalized_device, by_ip, "ip"

    return client_ip, normalized_device, None, "none"
