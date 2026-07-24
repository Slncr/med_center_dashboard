# Backend

Python 3.11, FastAPI, SQLAlchemy 2, Pydantic v2. Точка входа: `backend/app/main.py`.

Префикс API: `/api/v1` (настраивается в `Settings.API_V1_STR`).

---

## Структура каталогов

```
backend/app/
├── main.py                 # FastAPI app, CORS, роутеры
├── deps.py                 # JWT, get_current_user, require_auth_or_public_display
├── api/v1/
│   ├── api.py              # Сборка роутеров
│   └── endpoints/
│       ├── auth.py         # login, register, /users/me
│       ├── users.py        # CRUD пользователей (admin)
│       ├── patients.py     # Пациенты, архив, флажки
│       ├── rooms.py        # Палаты с койками
│       ├── medical.py      # Наблюдения, процедуры, назначения, 530н
│       ├── monitoring.py   # Дашборд палаты, ATM, зоны
│       ├── bracelet_alerts.py
│       ├── integration.py  # 1С sync
│       └── ws.py           # WebSocket
├── crud/                   # patient, room, medical, user
├── models/                 # SQLAlchemy ORM
├── schemas/                # Pydantic request/response
├── services/
│   ├── monitoring_service.py   # HTTP к Monitoring API
│   ├── onec_service.py         # Импорт из 1С
│   ├── mit_service.py          # HTTP-клиент 1С
│   ├── form_530n_service.py    # Форма 530/н
│   └── prescription_package_service.py
├── bracelet_alerts/        # Подсистема алертов (см. ниже)
├── tasks/
│   ├── celery_worker.py    # Celery app + beat_schedule
│   ├── tasks.py            # import_hospital_documents_from_1c
│   └── bracelet_alert_tasks.py
└── core/
    ├── config.py           # Settings (pydantic-settings)
    ├── database.py         # Session, engine
    ├── security.py         # hash/verify password
    └── websocket_manager.py
```

---

## Слои и ответственность

| Слой | Где | Задача |
|------|-----|--------|
| **Endpoints** | `api/v1/endpoints/` | HTTP, валидация, коды ответов, зависимости auth |
| **Schemas** | `schemas/` | Pydantic-модели запросов и ответов |
| **CRUD** | `crud/` | Запросы к PostgreSQL |
| **Services** | `services/` | Сложная бизнес-логика, внешние HTTP |
| **Models** | `models/` | ORM-таблицы |
| **Tasks** | `tasks/` | Асинхронные фоновые операции |

Правило: endpoint вызывает service/crud, не обращается к внешним API напрямую (кроме простых случаев).

---

## Аутентификация

Реализация: `deps.py`, `core/security.py`, `api/v1/endpoints/auth.py`.

1. `POST /auth/login` → JWT (`sub` = username).
2. Защищённые endpoint'ы: `Depends(get_current_user)`.
3. Публичный режим палаты: `Depends(require_auth_or_public_display)` — если `ALLOW_PUBLIC_ROOM_DISPLAY=True` и нет токена, доступ разрешён для read-only endpoint'ов.

Роли проверяются в endpoint'ах (например, `bracelet-alerts` — nurse/admin).

---

## Пакет `bracelet_alerts`

Отдельный модуль для мониторинга BLE и оповещений.

| Файл | Назначение |
|------|------------|
| `thresholds.py` | Глобальные пороги по метрикам (`pulse`, `spo2`, `temp`, …), уровни `normal/warning/critical` |
| `threshold_resolver.py` | Слияние defaults + `vital_threshold_overrides` пациента |
| `patient_thresholds.py` | CRUD порогов пациента |
| `collector.py` | Сбор снимка виталов активных пациентов с Monitoring API |
| `evaluator.py` | Сравнение значений с порогами |
| `dedup_store.py` | Redis cooldown повторных алертов |
| `max_notifier.py` | Отправка в MAX Bot API |
| `assignment.py` | Привязка/отвязка MAC, автораспределение, список непривязанных |
| `service.py` | Оркестрация для API endpoint'ов |

### Канонические метрики браслета

`pulse`, `spo2`, `temp`, `respiration`, `press`, `hrv`, `stress`, `sleep`, `battery`.

Персональные overrides хранятся в JSON:

```json
{
  "pulse": { "enabled": true, "warning_low": 55, "critical_low": 45 },
  "spo2": { "enabled": true, "warning_low": 93 }
}
```

---

## Сервис мониторинга

`services/monitoring_service.py` — HTTP-клиент к `MONITORING_API_URL`.

Основные операции:

- Состояние устройств BLE (`/state` или аналог)
- Метрики по MAC
- Атмосфера по зоне (`monitor_zone` палаты)
- Health-check внешнего API

Дашборд палаты (`GET /monitoring/dashboard`) собирает:

- Список коек комнаты с пациентами
- BLE-метрики для каждого `ble_mac`
- `atmosphere: { temp, hum, press, co2 }`
- `unassigned_ble` — устройства без пациента
- `atmosphere_error` / `monitoring_error` при сбоях

---

## Интеграция 1С

`services/onec_service.py`, `services/mit_service.py`.

Задача `import_hospital_documents_from_1c`:

1. HTTP к `ONEC_BASE_URL`
2. Парсинг документов стационара
3. Upsert пациентов по `external_id`
4. Привязка к `beds` / `rooms`
5. Архивация отсутствующих в выгрузке

Ручной триггер: `POST /integration/1c/sync`.

---

## WebSocket

`core/websocket_manager.py`, `endpoints/ws.py`.

```
WS /api/v1/ws/{room_id}?token=<jwt>
```

События для медсестры: новые/отменённые/выполненные назначения. Токен передаётся в query string.

---

## Celery

Конфигурация: `tasks/celery_worker.py`.

| Задача | Период | Модуль |
|--------|--------|--------|
| `import_hospital_documents_from_1c` | 3600 с | `tasks/tasks.py` |
| `check_bracelet_vitals_and_notify` | `BRACELET_ALERT_CHECK_INTERVAL_SEC` | `tasks/bracelet_alert_tasks.py` |

Часовой пояс: `Europe/Moscow`.

Подробнее: [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md).

---

## Форма 530/н

`services/form_530n_service.py` + endpoint'ы `/medical/form-530n/`.

Агрегирует наблюдения, процедуры и назначения за период (7/14 дней). Поддерживает HTML для печати.

---

## Локальная разработка

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://med_user:med_pass@localhost:5432/med_center
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Swagger: http://localhost:8000/docs

---

## Связанные документы

- [API.md](./API.md)
- [DATABASE.md](./DATABASE.md)
- [CONFIGURATION.md](./CONFIGURATION.md)
- [INTEGRATIONS.md](./INTEGRATIONS.md)
