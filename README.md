# Med Center Dashboard

Веб-приложение для стационара медицинского центра: учёт пациентов и коек, назначения, наблюдения, форма 530/н, мониторинг браслетов и атмосферы палат, оповещения в MAX, синхронизация с 1С.

## Быстрый старт

```bash
docker compose up -d --build
```

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Экран палаты | http://localhost:3000/room |

## Документация

Полная документация — в каталоге **[docs/](./docs/README.md)**:

| Документ | Содержание |
|----------|------------|
| [docs/README.md](./docs/README.md) | Индекс, обзор проекта, стек |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Архитектура и потоки данных |
| [docs/BACKEND.md](./docs/BACKEND.md) | Backend: модули, слои, пакеты |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | Frontend: страницы, компоненты, API-клиент |
| [docs/DATABASE.md](./docs/DATABASE.md) | Схема БД, миграции |
| [docs/API.md](./docs/API.md) | REST API |
| [docs/ROOM_DISPLAY.md](./docs/ROOM_DISPLAY.md) | Публичный экран палаты (v2) |
| [docs/SITEMAP.md](./docs/SITEMAP.md) | Карта экранов для UX/UI |
| [docs/ROLES_AND_AUTH.md](./docs/ROLES_AND_AUTH.md) | Роли, JWT, публичный доступ |
| [docs/SETUP.md](./docs/SETUP.md) | Установка и локальный запуск |
| [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) | Переменные окружения |
| [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md) | 1С, Monitoring API, MAX |
| [docs/BACKGROUND_JOBS.md](./docs/BACKGROUND_JOBS.md) | Celery Beat и задачи |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Продакшен и чеклист |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Руководство разработчика |

## Структура репозитория

```
med_center_dashboard/
├── backend/          # FastAPI, SQLAlchemy, Celery, Alembic
├── frontend/         # React 18, TypeScript (CRA)
├── docs/             # Документация
├── docker-compose.yml
├── .env.example
└── setup.sh
```

## Роли

| Роль | Маршрут после входа |
|------|---------------------|
| admin | `/register` |
| nurse | `/nurse/appointments` |
| doctor | `/doctor/patients` |
| гость | `/login`, `/room` (без входа) |
