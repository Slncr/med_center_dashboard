from sqlalchemy.orm import Session
from app.models.room import Room as RoomModel
from app.models.bed import Bed as BedModel
from app.models.patient import Patient

def get_all_rooms_with_beds(db: Session):
    rooms = db.query(RoomModel).all()
    result = []

    for r in rooms:
        beds = db.query(BedModel).filter(BedModel.room_id == r.id).all()
        beds_with_patients = []

        for b in beds:
            patient = None
            if b.patients:
                # Предполагаем, что у койки может быть один пациент
                patient = b.patients[0]  # или использовать first()
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