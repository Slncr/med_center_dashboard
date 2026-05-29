import re
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.medical import (
    Prescription,
    PrescriptionPackage,
    PrescriptionPackageStatus,
    PrescriptionStatus,
    PrescriptionType,
)


def parse_executions_required(frequency: Optional[str], explicit: Optional[int] = None) -> int:
    if explicit is not None and explicit >= 1:
        return min(24, explicit)
    if not frequency:
        return 1
    match = re.search(r"(\d+)", frequency)
    if match:
        return max(1, min(24, int(match.group(1))))
    return 1


def refresh_package_status(db: Session, package_id: int) -> None:
    package = db.query(PrescriptionPackage).filter(PrescriptionPackage.id == package_id).first()
    if not package:
        return

    items: List[Prescription] = (
        db.query(Prescription)
        .filter(
            Prescription.package_id == package_id,
            Prescription.prescription_type.in_(
                [PrescriptionType.PROCEDURE, PrescriptionType.MEASUREMENT],
            ),
        )
        .all()
    )
    if not items:
        return

    all_done = all(p.status == PrescriptionStatus.COMPLETED for p in items)
    if all_done:
        package.status = PrescriptionPackageStatus.COMPLETED
        package.completed_at = datetime.utcnow()
    else:
        package.status = PrescriptionPackageStatus.ACTIVE
        package.completed_at = None
