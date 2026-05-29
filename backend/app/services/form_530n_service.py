"""Формирование данных и HTML для формы 530/н."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from html import escape
from typing import Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from app.models.bed import Bed
from app.models.medical import MedicalRecord, Prescription, PrescriptionStatus, Procedure
from app.models.patient import Patient
from app.utils.timezone import format_time_moscow, now_moscow
from app.schemas.form_530n import (
    Form530nObservationRow,
    Form530nPatientInfo,
    Form530nPrescriptionItem,
    Form530nProcedureItem,
    Form530nResponse,
)


def _calc_age(birth_date: Optional[datetime]) -> Optional[int]:
    if not birth_date:
        return None
    today = date.today()
    bd = birth_date.date() if isinstance(birth_date, datetime) else birth_date
    return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))


def _format_bp(sys: Optional[int], dia: Optional[int]) -> Optional[str]:
    if sys is None and dia is None:
        return None
    if sys is not None and dia is not None:
        return f"{sys}/{dia}"
    return str(sys or dia)


def _default_period(patient: Patient) -> Tuple[date, date]:
    period_to = date.today()
    if patient.admission_date:
        adm = patient.admission_date.date() if isinstance(patient.admission_date, datetime) else patient.admission_date
        period_from = adm
    else:
        period_from = period_to - timedelta(days=13)
    if period_from > period_to:
        period_from = period_to
    return period_from, period_to


def build_form_530n(
    db: Session,
    patient_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Form530nResponse:
    patient = (
        db.query(Patient)
        .options(joinedload(Patient.bed).joinedload(Bed.room))
        .filter(Patient.id == patient_id)
        .first()
    )
    if not patient:
        raise ValueError("Patient not found")

    period_from, period_to = date_from, date_to
    if not period_from or not period_to:
        default_from, default_to = _default_period(patient)
        period_from = period_from or default_from
        period_to = period_to or default_to
    if period_from > period_to:
        period_from, period_to = period_to, period_from

    room_number = None
    bed_number = None
    if patient.bed:
        bed_number = str(patient.bed.number)
        if patient.bed.room:
            room_number = str(patient.bed.room.number)

    patient_info = Form530nPatientInfo(
        id=patient.id,
        full_name=patient.full_name,
        birth_date=patient.birth_date,
        age=_calc_age(patient.birth_date),
        gender=patient.gender,
        medical_record_number=patient.medical_record_number,
        admission_date=patient.admission_date,
        department_name=patient.department_name,
        room_number=room_number,
        bed_number=bed_number,
    )

    records = (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.record_date >= period_from,
            MedicalRecord.record_date <= period_to,
        )
        .order_by(MedicalRecord.record_date.asc(), MedicalRecord.created_at.asc())
        .all()
    )

    observation_rows: list[Form530nObservationRow] = []
    for rec in records:
        record_time = format_time_moscow(rec.created_at)
        observation_rows.append(
            Form530nObservationRow(
                id=rec.id,
                record_date=rec.record_date,
                record_time=record_time,
                temperature=rec.temperature,
                pulse=rec.pulse,
                blood_pressure=_format_bp(rec.blood_pressure_systolic, rec.blood_pressure_diastolic),
                respiration_rate=rec.respiration_rate,
                spO2=rec.spO2,
                weight=rec.weight,
                height=rec.height,
                complaints=rec.complaints,
                examination=rec.examination,
                diagnosis=rec.diagnosis,
                recommendations=rec.recommendations,
            )
        )

    prescriptions = (
        db.query(Prescription)
        .filter(
            Prescription.patient_id == patient_id,
            Prescription.status == PrescriptionStatus.ACTIVE,
        )
        .order_by(Prescription.created_at.desc())
        .all()
    )
    prescription_items = [
        Form530nPrescriptionItem(
            id=p.id,
            name=p.name,
            prescription_type=str(p.prescription_type.value if hasattr(p.prescription_type, "value") else p.prescription_type),
            frequency=p.frequency,
            status=str(p.status.value if hasattr(p.status, "value") else p.status),
        )
        for p in prescriptions
    ]

    period_start = datetime.combine(period_from, datetime.min.time())
    period_end = datetime.combine(period_to, datetime.max.time())
    all_procedures = (
        db.query(Procedure)
        .filter(Procedure.patient_id == patient_id)
        .order_by(Procedure.scheduled_time.asc())
        .all()
    )
    procedures = [
        p
        for p in all_procedures
        if p.scheduled_time is None
        or (period_start <= p.scheduled_time <= period_end)
    ]
    procedure_items = [
        Form530nProcedureItem(
            id=p.id,
            name=p.name,
            status=str(p.status.value if hasattr(p.status, "value") else p.status),
            scheduled_time=p.scheduled_time,
            notes=p.notes,
        )
        for p in procedures
    ]

    return Form530nResponse(
        patient=patient_info,
        period_from=period_from,
        period_to=period_to,
        generated_at=now_moscow(),
        observations=observation_rows,
        prescriptions=prescription_items,
        procedures=procedure_items,
        observations_count=len(observation_rows),
    )


def _cell(value: Optional[str | float | int]) -> str:
    if value is None or value == "":
        return "—"
    return escape(str(value))


def render_form_530n_html(data: Form530nResponse, organization: str = "Медицинский центр") -> str:
    p = data.patient
    adm = ""
    if p.admission_date:
        adm = p.admission_date.strftime("%d.%m.%Y") if isinstance(p.admission_date, datetime) else str(p.admission_date)

    obs_rows = ""
    for row in data.observations:
        obs_rows += f"""
        <tr>
          <td>{row.record_date.strftime('%d.%m.%Y')}</td>
          <td>{_cell(row.record_time)}</td>
          <td>{_cell(row.temperature)}</td>
          <td>{_cell(row.pulse)}</td>
          <td>{_cell(row.blood_pressure)}</td>
          <td>{_cell(row.respiration_rate)}</td>
          <td>{_cell(row.spO2)}</td>
          <td>{_cell(row.weight)}</td>
          <td class="notes">{_cell(row.complaints or row.examination)}</td>
        </tr>"""

    if not obs_rows:
        obs_rows = '<tr><td colspan="9" class="empty">Нет записей за выбранный период</td></tr>'

    rx_items = "".join(
        f"<li>{escape(r.name)} ({escape(r.prescription_type)}) — {escape(r.frequency or '—')}</li>"
        for r in data.prescriptions
    ) or "<li>Нет активных назначений</li>"

    proc_items = "".join(
        f"<li>{escape(pr.name)} — {escape(pr.status)}"
        f"{', ' + pr.scheduled_time.strftime('%d.%m.%Y %H:%M') if pr.scheduled_time else ''}</li>"
        for pr in data.procedures
    ) or "<li>Нет процедур за период</li>"

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Форма 530/н — {escape(p.full_name)}</title>
  <style>
    body {{ font-family: 'Times New Roman', serif; font-size: 12pt; margin: 20px; color: #000; }}
    h1 {{ font-size: 14pt; text-align: center; margin: 0 0 4px; }}
    .meta {{ margin-bottom: 16px; line-height: 1.5; }}
    .meta span {{ display: inline-block; min-width: 220px; }}
    table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
    th, td {{ border: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: top; }}
    th {{ background: #f0f0f0; font-size: 10pt; }}
    td.notes {{ text-align: left; min-width: 120px; }}
    .empty {{ font-style: italic; color: #555; }}
    .section {{ margin-top: 16px; }}
    .section h2 {{ font-size: 12pt; margin-bottom: 6px; }}
    ul {{ margin: 0; padding-left: 20px; }}
    @media print {{
      body {{ margin: 10mm; }}
      .no-print {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:12px;">
    <button onclick="window.print()">Печать</button>
  </div>
  <h1>Форма {escape(data.form_code)}</h1>
  <p style="text-align:center;margin:0 0 12px;">{escape(data.form_title)}</p>
  <div class="meta">
    <div><strong>Учреждение:</strong> {escape(organization)}</div>
    <div><span><strong>ФИО:</strong> {escape(p.full_name)}</span>
        <span><strong>Возраст:</strong> {_cell(p.age)}</span>
        <span><strong>Пол:</strong> {_cell(p.gender)}</span></div>
    <div><span><strong>№ истории:</strong> {_cell(p.medical_record_number)}</span>
        <span><strong>Палата/койка:</strong> {_cell(p.room_number)}/{_cell(p.bed_number)}</span></div>
    <div><span><strong>Отделение:</strong> {_cell(p.department_name)}</span>
        <span><strong>Поступил:</strong> {_cell(adm)}</span></div>
    <div><strong>Период:</strong> {data.period_from.strftime('%d.%m.%Y')} — {data.period_to.strftime('%d.%m.%Y')}
        &nbsp;|&nbsp; <strong>Сформировано:</strong> {data.generated_at.strftime('%d.%m.%Y %H:%M')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Дата</th><th>Время</th><th>t°</th><th>Пульс</th><th>АД</th>
        <th>Дых.</th><th>SpO₂</th><th>Вес</th><th>Жалобы / осмотр</th>
      </tr>
    </thead>
    <tbody>{obs_rows}</tbody>
  </table>
  <div class="section">
    <h2>Активные назначения</h2>
    <ul>{rx_items}</ul>
  </div>
  <div class="section">
    <h2>Процедуры за период</h2>
    <ul>{proc_items}</ul>
  </div>
</body>
</html>"""
