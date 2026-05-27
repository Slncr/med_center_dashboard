"""Клиент тестового сервиса BLE/ATM мониторинга."""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

METRIC_KEYS = frozenset({"temp", "hum", "press", "co2", "pulse", "hr", "spo2", "battery", "rssi", "online"})


def normalize_mac(mac: str) -> str:
    return re.sub(r"[^a-fA-F0-9]", "", mac).lower()


def unwrap_metric(value: Any) -> Any:
    """{value, ts} -> value; иначе как есть."""
    if isinstance(value, dict) and "value" in value:
        return value["value"]
    return value


def unwrap_metrics_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Разворачивает все поля вида {value, ts} в плоский словарь."""
    result: Dict[str, Any] = {}
    for key, raw in data.items():
        if key in ("mac", "id", "address", "name", "label", "updated_at", "last_seen", "ts"):
            continue
        if isinstance(raw, dict):
            if "value" in raw:
                result[key] = unwrap_metric(raw)
            elif key not in METRIC_KEYS and not any(isinstance(v, dict) for v in raw.values()):
                result[key] = raw
            else:
                for sub_key, sub_val in raw.items():
                    if sub_key in ("value", "ts"):
                        continue
                    if isinstance(sub_val, dict) and "value" in sub_val:
                        result[sub_key] = unwrap_metric(sub_val)
                    elif not isinstance(sub_val, (dict, list)):
                        result[sub_key] = sub_val
        elif not isinstance(raw, (list,)):
            result[key] = raw
    return result


def parse_online_flag(data: Dict[str, Any]) -> Optional[bool]:
    raw = data.get("online")
    if raw is None:
        if data.get("last_seen"):
            return True
        return None
    val = unwrap_metric(raw)
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        return val.lower() in ("1", "true", "yes", "on", "online")
    return None


class MonitoringService:
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[int] = None):
        raw = (base_url or settings.MONITORING_API_URL or "").rstrip("/")
        self.base_url = raw if raw.endswith("/api") else f"{raw}/api" if raw else ""
        self.timeout = timeout or settings.MONITORING_API_TIMEOUT

    def _get(self, path: str) -> Any:
        if not self.base_url:
            raise ValueError("MONITORING_API_URL is not configured")
        url = f"{self.base_url}{path}"
        response = requests.get(url, timeout=self.timeout)
        if response.status_code == 404:
            try:
                data = response.json()
            except ValueError:
                data = {}
            if isinstance(data, dict) and data.get("error"):
                return data
        response.raise_for_status()
        return response.json()

    def get_health(self) -> Dict[str, Any]:
        return self._get("/health")

    def get_state(self) -> Dict[str, Any]:
        return self._get("/state")

    def get_ble_all(self) -> Any:
        return self._get("/ble")

    def get_ble_device(self, mac: str) -> Dict[str, Any]:
        return self._get(f"/ble/{normalize_mac(mac)}")

    def get_atm_room(self, room: int) -> Dict[str, Any]:
        return self._get(f"/atm/{room}")

    def get_atm_metric(self, room: int, metric: str) -> Any:
        return self._get(f"/atm/{room}/{metric.strip().lower()}")

    def get_atm_all(self) -> Any:
        return self._get("/atm")


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _normalize_ble_entry(mac: str, entry: Dict[str, Any]) -> Dict[str, Any]:
    """Один трекер: метрики могут быть вложены в entry или в entry['metrics']."""
    if "metrics" in entry and isinstance(entry["metrics"], dict):
        base = {**entry["metrics"], **{k: v for k, v in entry.items() if k != "metrics"}}
    else:
        base = dict(entry)
    base["mac"] = normalize_mac(mac)
    return unwrap_metrics_dict(base)


def _extract_ble_map(state: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    ble = state.get("ble") or state.get("trackers") or state.get("devices")
    if isinstance(ble, dict):
        return {normalize_mac(k): _normalize_ble_entry(k, _as_dict(v)) for k, v in ble.items()}
    if isinstance(ble, list):
        result: Dict[str, Dict[str, Any]] = {}
        for item in ble:
            if not isinstance(item, dict):
                continue
            mac = item.get("mac") or item.get("id") or item.get("address")
            if mac:
                result[normalize_mac(str(mac))] = _normalize_ble_entry(str(mac), item)
        return result
    return {}


def normalize_atm_zone(zone_data: Dict[str, Any]) -> Dict[str, Any]:
    """Поддержка форматов: плоский dict, {metrics:{co2:{value}}}, /atm/1/co2 -> {value}."""
    if not zone_data:
        return {}
    if "metrics" in zone_data and isinstance(zone_data["metrics"], dict):
        return unwrap_metrics_dict(zone_data["metrics"])
    if "value" in zone_data and len(zone_data) <= 4:
        return zone_data
    return unwrap_metrics_dict(zone_data)


def _atm_payload_root(data: Dict[str, Any]) -> Dict[str, Any]:
    """Корень со зонами: state.atm, GET /atm -> {rooms:{1:...}}."""
    for key in ("atm", "rooms", "atmosphere", "zones"):
        block = data.get(key)
        if isinstance(block, dict) and block:
            return block
    return data if isinstance(data, dict) else {}


def _extract_atm_map(state: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    root = _atm_payload_root(state)
    if not root:
        return {}
    result: Dict[str, Dict[str, Any]] = {}
    for k, v in root.items():
        if str(k) in ("updated_at", "broker", "error", "message"):
            continue
        if isinstance(v, dict):
            result[str(k)] = normalize_atm_zone(v)
    return result


def list_available_atm_zones(
    atm_map: Dict[str, Dict[str, Any]],
    service: Optional[MonitoringService] = None,
) -> List[int]:
    zones: List[int] = []
    for key in atm_map:
        try:
            zones.append(int(key))
        except ValueError:
            continue
    if zones:
        return sorted(zones)
    if service is None:
        return []
    try:
        raw = _as_dict(service.get_atm_all())
        extra = _extract_atm_map(raw)
        for key in extra:
            try:
                zones.append(int(key))
            except ValueError:
                continue
    except Exception as exc:
        logger.debug("list_available_atm_zones failed: %s", exc)
    return sorted(set(zones))


def is_atm_error_response(data: Any) -> bool:
    return isinstance(data, dict) and bool(data.get("error"))


ATM_METRICS = ("temp", "hum", "press", "co2")


def fetch_atmosphere_for_zone(service: MonitoringService, zone: int) -> Dict[str, Any]:
    """Собирает атмосферу: сначала /atm/{zone}, затем дозапрос /atm/{zone}/{metric}."""
    result: Dict[str, Any] = {k: None for k in ATM_METRICS}

    try:
        room_data = _as_dict(service.get_atm_room(zone))
        if is_atm_error_response(room_data):
            logger.warning("ATM room %s: %s", zone, room_data.get("message") or room_data.get("error"))
        else:
            parsed = normalize_atm_zone(room_data)
            for key in ATM_METRICS:
                if parsed.get(key) is not None:
                    result[key] = parsed.get(key)
    except Exception as exc:
        logger.warning("ATM room %s failed: %s", zone, exc)

    for key in ATM_METRICS:
        if result[key] is not None:
            continue
        try:
            raw = service.get_atm_metric(zone, key)
            if is_atm_error_response(raw):
                continue
            if isinstance(raw, dict):
                result[key] = unwrap_metric(raw)
            else:
                result[key] = raw
        except Exception as exc:
            logger.debug("ATM %s/%s failed: %s", zone, key, exc)

    return result


def metrics_from_device(device: Dict[str, Any]) -> Dict[str, Any]:
    skip = {"mac", "id", "address", "name", "label", "online", "updated_at", "last_seen", "ts"}
    return {k: v for k, v in device.items() if k not in skip and v is not None}


def parse_atmosphere(zone_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not zone_data:
        return None
    flat = normalize_atm_zone(zone_data)
    return {
        "temp": flat.get("temp"),
        "hum": flat.get("hum"),
        "press": flat.get("press"),
        "co2": flat.get("co2"),
    }


def fetch_monitoring_snapshot(service: MonitoringService) -> Dict[str, Any]:
    health: Dict[str, Any] = {"ok": False}
    state: Dict[str, Any] = {}
    ble_map: Dict[str, Dict[str, Any]] = {}
    atm_map: Dict[str, Dict[str, Any]] = {}

    try:
        health = _as_dict(service.get_health())
        health.setdefault("ok", True)
    except Exception as exc:
        logger.warning("Monitoring health failed: %s", exc)
        health = {"ok": False, "error": str(exc)}

    try:
        state = _as_dict(service.get_state())
        ble_map = _extract_ble_map(state)
        atm_map = _extract_atm_map(state)
    except Exception as exc:
        logger.warning("Monitoring state failed: %s", exc)
        try:
            ble_raw = service.get_ble_all()
            if isinstance(ble_raw, dict):
                ble_map = _extract_ble_map({"ble": ble_raw})
            elif isinstance(ble_raw, list):
                ble_map = _extract_ble_map({"ble": ble_raw})
        except Exception as ble_exc:
            logger.warning("Monitoring ble fallback failed: %s", ble_exc)

        try:
            atm_raw = service.get_atm_all()
            if isinstance(atm_raw, dict):
                atm_map = _extract_atm_map(atm_raw)
        except Exception as atm_exc:
            logger.warning("Monitoring atm fallback failed: %s", atm_exc)

        if not ble_map and not atm_map:
            state = {"error": str(exc)}

    return {
        "health": health,
        "state": state,
        "ble": ble_map,
        "atm": atm_map,
    }


monitoring_service = MonitoringService()
