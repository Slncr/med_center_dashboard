# Фоновые задачи (Celery)

## Сервисы

| Процесс | Команда (compose) | Назначение |
|---------|-------------------|------------|
| **celery worker** | `celery ... worker` | Выполнение задач |
| **celery-beat** | `celery ... beat` | Расписание |

Broker и backend результатов: Redis (`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`).

Часовой пояс задач: **Europe/Moscow**.

## Расписание (Beat)

Определено в `backend/app/tasks/celery_worker.py`:

| Задача | Интервал | Описание |
|--------|----------|----------|
| `import_hospital_documents_from_1c` | **3600 с** (1 ч) | Импорт стационарных пациентов из 1С, архивация отсутствующих в выгрузке |
| `check_bracelet_vitals_and_notify` | **`BRACELET_ALERT_CHECK_INTERVAL_SEC`** (по умолчанию 60 с) | Проверка виталов активных пациентов, алерты в MAX |

## Задача: импорт из 1С

**Модуль:** `app.tasks.tasks.import_hospital_documents_from_1c`

**Логика (кратко):**

1. Запрос к HTTP-сервису 1С (`mit_service` / `ONEC_BASE_URL`).
2. Сопоставление по `external_id`.
3. Создание/обновление активных пациентов, привязка к койкам.
4. Пациенты, пропавшие из выгрузки → статус `DISCHARGED`.

**Дублирование с UI:** медсестра раз в час вызывает `POST /integration/1c/sync` с фронта (`usePatients`).

## Задача: алерты браслетов

**Модуль:** `app.tasks.bracelet_alert_tasks.check_bracelet_vitals_and_notify`

**Логика (кратко):**

1. Если `BRACELET_ALERTS_ENABLED=False` — выход.
2. Снимок виталов активных пациентов (`bracelet_alerts.collector`).
3. Сравнение с порогами (`evaluator` + `threshold_resolver`).
4. Дедупликация повторов через Redis (`BRACELET_ALERT_COOLDOWN_SEC`).
5. Отправка в MAX (`max_notifier`), если заданы `MAX_BOT_TOKEN` и `MAX_ALERT_CHAT_ID`.

**Ручной запуск:** `POST /api/v1/bracelet-alerts/check` (медсестра, вкладка «Браслеты»).

## Другие задачи в коде

`sync_patients_with_1c` — устаревшая/дополнительная синхронизация по расписанию (не в beat_schedule по умолчанию). См. `app/tasks/tasks.py`.

## Мониторинг worker

```bash
docker compose logs -f celery
docker compose logs -f celery-beat
```

При ошибках 1С или Monitoring API задачи логируются; UI продолжает работать с данными из PostgreSQL.

## Локальный запуск

```bash
cd backend
source venv/bin/activate
export DATABASE_URL=...
export CELERY_BROKER_URL=redis://localhost:6379/1

celery -A app.tasks.celery_worker.celery_app worker --loglevel=info --pool=solo
celery -A app.tasks.celery_worker.celery_app beat --loglevel=info
```

См. [INTEGRATIONS.md](./INTEGRATIONS.md), [SETUP.md](./SETUP.md).
