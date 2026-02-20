import requests
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.patient import Patient, PatientStatus
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
    archived_count = 0
    active_count = 0
    new_count = 0

    # ✅ Текущая дата для сравнения (без времени)
    now = datetime.utcnow().date()

    # ✅ Получаем всех активных пациентов из БД
    all_patients_in_db = db.query(Patient).filter(Patient.status == PatientStatus.ACTIVE).all()
    all_patients_in_db_dict = {p.external_id: p for p in all_patients_in_db}

    # ✅ Собираем пациентов из 1С
    patients_from_1c = {}
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
        patients_from_1c[hospital_doc.client] = hospital_doc

    # ✅ Обработка существующих пациентов
    for external_id, patient in all_patients_in_db_dict.items():
        if external_id not in patients_from_1c:
            # Пациент есть в БД, но отсутствует в 1С — архивируем
            patient.status = PatientStatus.DISCHARGED  # ✅ Правильный статус
            if not patient.discharge_date:
                patient.discharge_date = datetime.utcnow()
            archived_count += 1
            continue

        hospital_doc = patients_from_1c[external_id]
        discharge_date = parse_date(hospital_doc.end_date).date() if hospital_doc.end_date else None

        # ✅ Архивируем ТОЛЬКО если дата выписки уже наступила (включая сегодня)
        if discharge_date and discharge_date < now:
            patient.status = PatientStatus.DISCHARGED  # ✅ Правильный статус
            patient.discharge_date = datetime.combine(discharge_date, datetime.min.time())
            archived_count += 1
        else:
            # Пациент активен — обновляем данные
            admission_date = parse_date(hospital_doc.start_date)
            
            # Найти или создать палату
            room = get_room_by_external_id(db, hospital_doc.room)
            if not room:
                room = create_room(db, hospital_doc.room, hospital_doc.room_name.replace("Палата № ", ""), hospital_doc.room_name)

            # Найти или создать койку
            bed = get_bed_by_external_id(db, hospital_doc.bed)
            if not bed:
                bed = create_bed(db, hospital_doc.bed, hospital_doc.bed_name.replace("Койка № ", ""), room.id)

            patient.full_name = hospital_doc.client_name
            patient.admission_date = admission_date
            patient.bed_id = bed.id
            patient.department_name = hospital_doc.department_name
            active_count += 1

    # ✅ Добавление новых пациентов
    for external_id, hospital_doc in patients_from_1c.items():
        if external_id in all_patients_in_db_dict:
            continue  # Уже обработан выше

        # Найти или создать палату
        room = get_room_by_external_id(db, hospital_doc.room)
        if not room:
            room = create_room(db, hospital_doc.room, hospital_doc.room_name.replace("Палата № ", ""), hospital_doc.room_name)

        # Найти или создать койку
        bed = get_bed_by_external_id(db, hospital_doc.bed)
        if not bed:
            bed = create_bed(db, hospital_doc.bed, hospital_doc.bed_name.replace("Койка № ", ""), room.id)

        admission_date = parse_date(hospital_doc.start_date)
        discharge_date = parse_date(hospital_doc.end_date).date() if hospital_doc.end_date else None

        # ✅ Статус определяется по дате выписки
        if discharge_date and discharge_date < now:
            status = PatientStatus.DISCHARGED  # ✅ Правильный статус
        else:
            status = PatientStatus.ACTIVE

        # Создаём нового пациента
        patient = create_patient(
            db,
            external_id=hospital_doc.client,
            full_name=hospital_doc.client_name,
            admission_date=admission_date,
            discharge_date=datetime.combine(discharge_date, datetime.min.time()) if discharge_date else None,
            status=status,
            bed_id=bed.id,
            document_id=hospital_doc.document,
            branch_id=hospital_doc.branch,
            department_id=hospital_doc.department,
            department_name=hospital_doc.department_name
        )

        if status == PatientStatus.DISCHARGED:
            archived_count += 1
        else:
            active_count += 1
            new_count += 1

        processed_count += 1

    db.commit()

    return {
        "processed_count": processed_count,
        "archived_count": archived_count,
        "active_count": active_count,
        "new_count": new_count,
        "message": f"Обработано {processed_count} записей ({active_count} активных, {archived_count} выписанных, {new_count} новых)"
    }