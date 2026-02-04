import requests
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.models.room import Room
from app.models.bed import Bed  # ✅ Правильный импорт
from app.schemas.medical import HospitalDocument
from app.crud.bed import get_bed_by_external_id, create_bed
from app.crud.room import get_room_by_external_id, create_room
from app.crud.patient import get_patient_by_external_id, create_patient

BASE_URL = 'http://172.191.7.27/g8_mis/hs/bwi/DictionaryData'
AUTH_HEADER = {'Authorization': 'Basic bW9uaXRvcjo0NzE1'}

def fetch_from_1c():
    payload = {
        "Key": "bc1ff18a4ee04bb993df251cf0ebbfb4",
        "Method": "GetHospitalDocuments"
    }
    response = requests.post(BASE_URL, json=payload, headers=AUTH_HEADER)
    response.raise_for_status()
    return response.json()

def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%d.%m.%Y %H:%M:%S")

def sync_with_1c(db: Session):
    raw_data = fetch_from_1c()
    docs = raw_data.get("Ответ", {}).get("КлиентыСтационара", [])

    processed_count = 0

    for doc in docs:
        hospital_doc = HospitalDocument(
            document=doc["Документ"],
            branch=doc["Филиал"],
            room=doc["Палата"],
            room_name=doc["ПалатаНаименование"].strip(),
            client=doc["Клиент"],
            client_name=doc["КлиентНаименование"],
            bed=doc["КойкоМесто"],
            bed_name=doc["КойкоМестоНаименование"],
            start_date=doc["ДатаНачала"],
            end_date=doc["ДатаОкончания"],
            department=doc["Подразделение"],
            department_name=doc["ПодразделениеНаименование"]
        )

        # Найти или создать палату
        room = get_room_by_external_id(db, hospital_doc.room)  # ✅ Правильный вызов
        if not room:
            room = create_room(db, hospital_doc.room, hospital_doc.room_name.replace("Палата № ", ""), hospital_doc.room_name)

        # Найти или создать койку
        bed = get_bed_by_external_id(db, hospital_doc.bed)
        if not bed:
            bed = create_bed(db, hospital_doc.bed, hospital_doc.bed_name.replace("Койка № ", ""), room.id)

        # Найти или создать пациента
        patient = get_patient_by_external_id(db, hospital_doc.client)
        if not patient:
            admission_date = parse_date(hospital_doc.start_date)
            discharge_date = parse_date(hospital_doc.end_date) if hospital_doc.end_date else None

            patient = create_patient(
                db,
                external_id=hospital_doc.client,
                full_name=hospital_doc.client_name,
                admission_date=admission_date,
                discharge_date=discharge_date,
                status='active',
                bed_id=bed.id,
                document_id=hospital_doc.document,
                branch_id=hospital_doc.branch,
                department_id=hospital_doc.department,
                department_name=hospital_doc.department_name
            )

        processed_count += 1

    return {"processed_count": processed_count, "message": f"Processed {processed_count} records"}