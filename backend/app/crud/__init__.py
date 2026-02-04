from . import patient, room, bed
from .patient import get_patient_by_external_id, create_patient
from .room import get_all_rooms_with_beds
from .bed import get_bed_by_external_id, create_bed

__all__ = [
    "get_patient_by_external_id",
    "create_patient",
    "get_all_rooms_with_beds",
    "get_bed_by_external_id",
    "create_bed",
    "create_room"
]