from sqlalchemy.orm import Session
from app.models.room import Room as RoomModel
from app.models.bed import Bed as BedModel
from app.models.patient import Patient, PatientStatus

def get_room_by_external_id(db: Session, external_id: str):
    return db.query(RoomModel).filter(RoomModel.external_id == external_id).first()

def create_room(db: Session, external_id: str, number: str, name: str):
    db_room = RoomModel(external_id=external_id, number=number, name=name)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def get_all_rooms_with_beds(db: Session):
    rooms = db.query(RoomModel).all()
    result = []

    for r in rooms:
        beds = db.query(BedModel).filter(BedModel.room_id == r.id).all()
        beds_with_patients = []

        for b in beds:
            patient = None
            if b.patients:
                active_patients = [p for p in b.patients if p.status == PatientStatus.ACTIVE]
                if active_patients:
                    patient = active_patients[0]
            beds_with_patients.append({
                "id": b.id,
                "number": b.number,
                "patient": patient  # будет сериализован через Pydantic
            })

        result.append({
            "id": r.id,
            "number": r.number,
            "beds": beds_with_patients
        })

    return result