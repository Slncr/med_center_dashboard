# Документация Med Center Dashboard

Набор документов для разработчиков, DevOps, дизайнеров и медицинского персонала, внедряющего систему.

---

## О проекте

**Med Center Dashboard** — SPA для работы стационара:

- **Станция медсестры** — пациенты, наблюдения, форма 530/н, выполнение назначений, мониторинг палат и браслетов.
- **Кабинет врача** — обзор, назначения (процедуры и измерения), отчёты, архив.
- **Администратор** — регистрация врачей и медсестёр, навигация между кабинетами.
- **Экран палаты** (`/room`) — публичный fullscreen-дисплей на мониторе в палате: койки, виталы с браслета, атмосфера, статусы пациента.

Данные о пациентах и койках приходят из **1С**. Телеметрия браслетов и датчиков атмосферы — из **Monitoring API**. Критические отклонения виталов уходят в мессенджер **MAX** через фоновые задачи Celery.

---

## Технологический стек

| Слой | Технологии |
|------|------------|
| **Frontend** | React 18, TypeScript, CRA, React Router 6, Axios, MUI (частично), шрифт Cygre |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2, Pydantic v2, Alembic |
| **БД** | PostgreSQL 15 |
| **Очереди** | Redis 7, Celery 5, Celery Beat |
| **Auth** | JWT (python-jose), bcrypt |
| **Realtime** | WebSocket (FastAPI + websockets) |
| **Инфра** | Docker Compose, nginx (prod frontend) |

---

## Карта документов

### Архитектура и код

| Документ | Описание |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Компоненты, диаграммы, ключевые потоки данных |
| [BACKEND.md](./BACKEND.md) | Структура backend, модули, сервисы, bracelet_alerts |
| [FRONTEND.md](./FRONTEND.md) | Страницы, компоненты, хуки, стили, API-клиент |
| [DATABASE.md](./DATABASE.md) | Таблицы, связи, миграции Alembic |
| [API.md](./API.md) | Обзор REST endpoint'ов |

### Экраны и UX

| Документ | Описание |
|----------|----------|
| [SITEMAP.md](./SITEMAP.md) | Карта экранов, роли, вкладки, модалки |
| [ROOM_DISPLAY.md](./ROOM_DISPLAY.md) | Публичный экран палаты v2: макет, метрики, опрос |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Руководство разработчика |
| [proposed-redesign-sitemap.html](./proposed-redesign-sitemap.html) | Визуальная sitemap для дизайна |

### Эксплуатация

| Документ | Описание |
|----------|----------|
| [SETUP.md](./SETUP.md) | Локальный запуск, Docker, типичные проблемы |
| [CONFIGURATION.md](./CONFIGURATION.md) | Переменные окружения |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Продакшен, nginx, чеклист |
| [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md) | Celery worker/beat, расписание |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | 1С, Monitoring API, MAX, WebSocket |
| [ROLES_AND_AUTH.md](./ROLES_AND_AUTH.md) | Роли, JWT, публичный режим `/room` |

---

## Быстрый старт

```bash
docker compose up -d --build
```

| Сервис | URL / порт |
|--------|------------|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Экран палаты | http://localhost:3000/room |

При старте `backend` выполняется `alembic upgrade head`. Frontend в dev собирается через `Dockerfile.dev` с hot-reload (`frontend/src` в volume).

---

## Структура репозитория

```
med_center_dashboard/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # HTTP-роуты
│   │   ├── bracelet_alerts/    # Пороги, алерты, привязка BLE
│   │   ├── core/               # config, security, database, websocket
│   │   ├── crud/               # Запросы к БД
│   │   ├── models/             # SQLAlchemy ORM
│   │   ├── schemas/            # Pydantic
│   │   ├── services/           # 530н, мониторинг, 1С, пакеты назначений
│   │   └── tasks/              # Celery
│   ├── alembic/versions/       # Миграции
│   └── requirements.txt
├── frontend/
│   ├── public/images/          # Иконки метрик, аватар, схемы коек
│   └── src/
│       ├── pages/              # Login, Nurse, Doctor, RoomDisplay
│       ├── components/         # nurse-station, doctor-station, bracelet-monitoring, …
│       ├── hooks/              # useAuth, usePatients, useBraceletOverview
│       ├── services/api.ts     # Единый HTTP-клиент
│       └── utils/
├── docs/                       # Эта папка
├── docker-compose.yml
├── .env.example
└── setup.sh
```

---

## Основные сценарии (кратко)

### Импорт пациентов из 1С

Celery Beat раз в час + ручной `POST /api/v1/integration/1c/sync` с UI медсестры. Пациенты создаются/обновляются по `external_id`, пропавшие из выгрузки архивируются.

### Назначения

Врач создаёт пакет → медсестра выполняет → WebSocket уведомляет станцию. Статусы: `ACTIVE`, `COMPLETED`, `CANCELLED`.

### Мониторинг палаты

`GET /api/v1/monitoring/dashboard?room_id=` — койки с BLE-метриками, атмосфера по `monitor_zone`, непривязанные устройства. Экран `/room` опрашивает каждые 3 с.

### Алерты браслетов

Celery каждые 60 с (настраивается) сравнивает виталы с порогами (глобальные + персональные в `patients.vital_threshold_overrides`) и шлёт в MAX с cooldown в Redis.

---

## Версия

Актуально для ветки разработки (июнь 2026). При изменении API, env или экранов обновляйте соответствующий файл в `docs/`.
