# Внешние интеграции

## 1. Стационарные пациенты (1С)

**Назначение:** импорт списка пациентов, коек, подразделений из MIS/1С.

**Конфиг:** `ONEC_BASE_URL`, `ONEC_USER`, `ONEC_PASSWORD`, `ONEC_TIMEOUT`

**Код:** `backend/app/services/mit_service.py`, `backend/app/services/onec_service.py`

**Триггеры:**

- Celery Beat — каждый час (`import_hospital_documents_from_1c`)
- API — `POST /api/v1/integration/1c/sync` (медсестра/админ)
- Frontend — `usePatients` раз в час на станции медсестры

**Поведение:**

- Новые пациенты создаются в БД.
- Существующие обновляются (ФИО, койка, подразделение).
- Пациенты, которых нет в выгрузке 1С, переводятся в архив (`DISCHARGED`).

**Отладка:** логи `celery` и ответ backend на ручной sync.

---

## 2. Monitoring API (браслеты + атмосфера)

**Назначение:** телеметрия BLE-браслетов по MAC пациента и датчики атмосферы (температура, влажность, давление, CO₂) по зонам палат.

**Конфиг:** `MONITORING_API_URL`, `MONITORING_API_TIMEOUT`

**Код:** `backend/app/services/monitoring_service.py`, endpoint'ы `/api/v1/monitoring/*`

**Потребители UI:**

| Экран | Интервал опроса |
|-------|-----------------|
| `/room` (публичный) | ~3 с |
| Медсестра → «Палаты» | ~4 с |
| Браслеты (overview) | ~30 с |

**Данные на дашборде палаты:**

- Список коек с `ble.metrics` (пульс, SpO₂, температура, …)
- `atmosphere` по `monitor_zone` палаты
- `unassigned_ble` — устройства без привязки к пациенту

**Привязка браслета:** поле `patients.ble_mac`, API `assign-bracelet` / `distribute-bracelets`.

---

## 3. MAX (мессенджер)

**Назначение:** push-уведомления медперсоналу о критических показателях браслета.

**Конфиг:**

- `MAX_BOT_TOKEN`
- `MAX_ALERT_CHAT_ID`
- `MAX_API_BASE_URL` (по умолчанию `https://platform-api.max.ru`)

**Код:** `backend/app/bracelet_alerts/max_notifier.py`

**Когда отправляется:**

- Фоновая задача Celery (см. [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md))
- Ручная проверка: `POST /bracelet-alerts/check`
- Тест: `POST /bracelet-alerts/test-max`

**Cooldown:** `BRACELET_ALERT_COOLDOWN_SEC` — не спамить одинаковым алертом.

Если токен/chat id не заданы — проверка работает, отправка пропускается.

---

## 4. WebSocket (внутренний канал)

Не внешняя система, но важен для UX: уведомления медсестры о новых назначениях без опроса API.

**URL:** `ws://<host>/api/v1/ws/<room_id>?token=<jwt>`

**Код:** `app/core/websocket_manager.py`, `app/api/v1/endpoints/ws.py`

---

## Схема зависимостей

```
1С ──────────────► PostgreSQL ◄──── UI (пациенты, койки)
                       ▲
Monitoring API ────────┤ (read-only snapshot)
                       │
                   Celery + MAX
```

При недоступности внешнего API приложение должно оставаться работоспособным с последними данными в БД; экран палаты покажет «нет данных с браслета».
