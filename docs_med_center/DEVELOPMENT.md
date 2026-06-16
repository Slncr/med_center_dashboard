# Руководство разработчика

Практические заметки по работе с кодовой базой.

---

## Первый запуск

```bash
# Вариант A: всё в Docker
docker compose up -d --build

# Вариант B: гибрид (БД в Docker, код локально)
docker compose up -d postgres redis
./setup.sh
# backend + celery — см. SETUP.md
cd frontend && npm start
```

Создайте первого админа через `POST /api/v1/auth/register` (если endpoint открыт) или напрямую в БД.

---

## Структура веток и коммитов

- Коммиты — только по запросу.
- Сообщения коммитов: кратко **зачем**, не только **что**.
- Не коммитить: `.env`, `backend/.env.local`, секреты, `celerybeat-schedule`.

---

## Где что менять

| Задача | Где |
|--------|-----|
| Новый REST endpoint | `backend/app/api/v1/endpoints/`, schema в `schemas/`, crud в `crud/` |
| Новая таблица | `models/` → `alembic revision --autogenerate` |
| Новая страница UI | `frontend/src/pages/` + маршрут в `App.tsx` |
| Вкладка медсестры/врача | `NurseDashboardPage.tsx` / `DoctorDashboardPage.tsx` |
| Экран палаты | `RoomDisplayPage.tsx`, `RoomDisplayPageV2.css` |
| Иконки метрик | `frontend/public/images/` |
| Пороги браслета (defaults) | `backend/app/bracelet_alerts/thresholds.py` |
| Расписание Celery | `backend/app/tasks/celery_worker.py` |
| Env-переменные | `backend/app/core/config.py`, `docker-compose.yml`, [CONFIGURATION.md](./CONFIGURATION.md) |

---

## Миграции БД

```bash
cd backend

# После изменения models/
alembic revision --autogenerate -m "add_something"
alembic upgrade head

# Откат на одну версию (осторожно в prod)
alembic downgrade -1
```

В Docker миграции применяются при старте `backend`. Для ручного запуска:

```bash
docker compose exec backend alembic upgrade head
```

---

## Frontend: проверки перед PR

```bash
cd frontend
npm run type-check
npm run lint
npm run build   # убедиться, что prod-сборка проходит
```

Hot-reload в Docker: volume `frontend/src` + `Dockerfile.dev`. Если UI не обновился — Ctrl+Shift+R.

---

## Backend: отладка

```bash
# Логи
docker compose logs -f backend
docker compose logs -f celery

# Swagger — тест endpoint'ов
open http://localhost:8000/docs

# Ручной sync 1С
curl -X POST http://localhost:8000/api/v1/integration/1c/sync \
  -H "Authorization: Bearer <token>"

# Ручная проверка браслетов
curl -X POST http://localhost:8000/api/v1/bracelet-alerts/check \
  -H "Authorization: Bearer <token>"
```

---

## Соглашения по коду

### Backend (Python)

- Type hints где возможно
- Pydantic v2 для API-схем
- Бизнес-логика в `services/` или `bracelet_alerts/`, не в endpoint'ах
- Логирование через `logging.getLogger(__name__)`

### Frontend (TypeScript)

- Функциональные компоненты + hooks
- Типы в `src/types/`, не `any`
- API только через `apiService` (`services/api.ts`)
- CSS в отдельных файлах рядом с компонентом
- Переиспользуемые утилиты — в `src/utils/`

### Именование

- API ключи метрик: lowercase (`pulse`, `spo2`, `temp`)
- MAC браслета: без двоеточий, нормализация на backend
- Роли: `admin`, `nurse`, `doctor` (lowercase в JWT и UI)

---

## Тестирование

```bash
# Frontend (CRA)
cd frontend && npm test

# Backend — отдельного test-suite в репозитории нет;
# проверяйте через Swagger и ручные сценарии
```

Рекомендуемый smoke-test после изменений:

1. Логин медсестры → список пациентов
2. Вкладка «Браслеты» → overview загружается
3. `/room` → койки и метрики (или «—» без Monitoring API)
4. Врач → создание назначения → медсестра видит toast

---

## Типичные проблемы

| Симптом | Решение |
|---------|---------|
| 401 на всех запросах | Перелогиниться; проверить `SECRET_KEY` |
| Пустой `/room` | Нет палат в БД → sync 1С или seed |
| Метрики «—» | Нет `ble_mac` или Monitoring API недоступен |
| Celery не стартует | Redis healthcheck; `CELERY_BROKER_URL` |
| CORS | `BACKEND_CORS_ORIGINS` |
| Старая версия UI в Docker | Hard refresh или `docker compose build frontend` |

Полный список: [SETUP.md](./SETUP.md) § Типичные проблемы.

---

## Связанные документы

- [SETUP.md](./SETUP.md)
- [BACKEND.md](./BACKEND.md)
- [FRONTEND.md](./FRONTEND.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
