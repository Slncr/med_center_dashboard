"""Привязка BLE-браслетов к пациентам."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from app.bracelet_alerts.evaluator import normalize_bracelet_metrics
from app.models.bed import Bed
from app.models.patient import Patient, PatientStatus
from app.services.monitoring_service import (
    fetch_monitoring_snapshot,
    metrics_from_device,
    monitoring_service,
    normalize_mac,
    parse_online_flag,
)

logger = logging.getLogger(__name__)


def _patient_sort_key(patient: Patient) -> Tuple[str, str, int]:
    bed = patient.bed
    room = str(bed.room.number) if bed and bed.room and bed.room.number is not None else "zzz"
    bed_no = str(bed.number) if bed and bed.number is not None else "zzz"
    return (room, bed_no, patient.id)


def _active_patients(db: Session) -> List[Patient]:
    return (
        db.query(Patient)
        .options(joinedload(Patient.bed).joinedload(Bed.room))
        .filter(Patient.status == PatientStatus.ACTIVE)
        .all()
    )


def _assigned_macs(patients: List[Patient]) -> set[str]:
    result: set[str] = set()
    for patient in patients:
        if patient.ble_mac:
            result.add(normalize_mac(patient.ble_mac))
    return result


def get_unassigned_devices(
    db: Session,
) -> Tuple[List[Dict[str, Any]], bool, Optional[str]]:
    """Свободные браслеты с сервера мониторинга (не привязаны ни к одному пациенту)."""
    patients = _active_patients(db)
    assigned = _assigned_macs(patients)
    monitoring_connected = False
    monitoring_error: Optional[str] = None
    devices: List[Dict[str, Any]] = []

    try:
        snapshot = fetch_monitoring_snapshot(monitoring_service)
        monitoring_connected = bool(snapshot["health"].get("ok", True)) and "error" not in snapshot.get(
            "state", {}
        )
        if snapshot.get("state", {}).get("error"):
            monitoring_error = str(snapshot["state"]["error"])
        ble_map = snapshot.get("ble") or {}
        for mac, data in ble_map.items():
            if mac in assigned:
                continue
            metrics = normalize_bracelet_metrics(metrics_from_device(data))
            devices.append(
                {
                    "mac": mac,
                    "online": parse_online_flag(data),
                    "metrics": metrics,
                }
            )
    except Exception as exc:
        logger.warning("Failed to fetch BLE for assignment: %s", exc)
        monitoring_error = str(exc)

    devices.sort(key=lambda d: (not d.get("online"), d["mac"]))
    return devices, monitoring_connected, monitoring_error


def _pair_dict(patient: Patient, mac: str) -> Dict[str, Any]:
    return {
        "patient_id": patient.id,
        "patient_name": patient.full_name,
        "ble_mac": mac,
        "room_number": str(patient.bed.room.number)
        if patient.bed and patient.bed.room
        else None,
        "bed_number": str(patient.bed.number) if patient.bed else None,
    }


def assign_bracelet_to_patient(db: Session, patient_id: int, ble_mac: str) -> Dict[str, Any]:
    """Привязать выбранный браслет к выбранному пациенту."""
    mac = normalize_mac(ble_mac)
    if not mac:
        raise ValueError("Некорректный MAC браслета")

    patient = (
        db.query(Patient)
        .options(joinedload(Patient.bed).joinedload(Bed.room))
        .filter(Patient.id == patient_id, Patient.status == PatientStatus.ACTIVE)
        .first()
    )
    if not patient:
        raise ValueError("Пациент не найден или не активен")

    if patient.ble_mac and normalize_mac(patient.ble_mac) != mac:
        raise ValueError(f"У пациента уже указан браслет {patient.ble_mac}")

    patients = _active_patients(db)
    assigned = _assigned_macs(patients)
    if mac in assigned:
        owner = next(
            (p for p in patients if p.ble_mac and normalize_mac(p.ble_mac) == mac),
            None,
        )
        name = owner.full_name if owner else "другой пациент"
        raise ValueError(f"Браслет уже привязан к: {name}")

    unassigned_devices, connected, error = get_unassigned_devices(db)
    unassigned_macs = {d["mac"] for d in unassigned_devices}
    if mac not in unassigned_macs:
        raise ValueError("Браслет не найден на сервере мониторинга или уже занят")

    patient.ble_mac = mac
    db.commit()
    db.refresh(patient)

    return {
        "pair": _pair_dict(patient, mac),
        "monitoring_connected": connected,
        "error": error,
        "message": f"Браслет {mac} привязан к {patient.full_name}",
    }


def unassign_bracelet_from_patient(db: Session, patient_id: int) -> Dict[str, Any]:
    """Снять привязку браслета с пациента (MAC остаётся на сервере как свободный)."""
    patient = (
        db.query(Patient)
        .options(joinedload(Patient.bed).joinedload(Bed.room))
        .filter(Patient.id == patient_id, Patient.status == PatientStatus.ACTIVE)
        .first()
    )
    if not patient:
        raise ValueError("Пациент не найден или не активен")

    if not patient.ble_mac:
        raise ValueError("У пациента нет привязанного браслета")

    mac = normalize_mac(patient.ble_mac)
    patient.ble_mac = None
    db.commit()
    db.refresh(patient)

    return {
        "patient_id": patient.id,
        "patient_name": patient.full_name,
        "ble_mac": mac,
        "message": f"Браслет {mac} отвязан от {patient.full_name}",
    }


def distribute_unassigned_bracelets(db: Session) -> Dict[str, Any]:
    """
    Привязывает свободные браслеты к активным пациентам без MAC (1:1 по порядку палата/койка).
    """
    patients = _active_patients(db)
    without_mac = sorted(
        [p for p in patients if not p.ble_mac],
        key=_patient_sort_key,
    )
    unassigned_devices, connected, error = get_unassigned_devices(db)

    pairs: List[Dict[str, Any]] = []
    for patient, device in zip(without_mac, unassigned_devices):
        mac = device["mac"]
        patient.ble_mac = mac
        pairs.append(_pair_dict(patient, mac))

    if pairs:
        db.commit()
        for patient in without_mac[: len(pairs)]:
            db.refresh(patient)

    remaining_devices, _, _ = get_unassigned_devices(db)
    still_without = len([p for p in _active_patients(db) if not p.ble_mac])

    return {
        "assigned_count": len(pairs),
        "pairs": pairs,
        "patients_without_mac_remaining": still_without,
        "unassigned_devices_remaining": [d["mac"] for d in remaining_devices],
        "monitoring_connected": connected,
        "error": error,
        "message": f"Привязано браслетов: {len(pairs)}",
    }
