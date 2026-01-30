from sqlalchemy.orm import Session
from app.models.bed import Bed

def get_bed_by_external_id(db: Session, external_id: str):
    return db.query(Bed).filter(Bed.external_id == external_id).first()

def create_bed(db: Session, external_id: str, number: str, room_id: int):
    db_bed = Bed(external_id=external_id, number=number, room_id=room_id, is_occupied=True)
    db.add(db_bed)
    db.commit()
    db.refresh(db_bed)
    return db_bed