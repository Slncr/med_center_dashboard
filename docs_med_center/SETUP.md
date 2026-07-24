# Установка и запуск

## Требования

- Docker и Docker Compose **или**
- Python 3.11+, Node.js 18+, PostgreSQL 15, Redis 7

## Вариант 1: Docker Compose (рекомендуется)

Из корня репозитория:

```bash
docker compose up -d --build
```

| Сервис | URL / порт |
|--------|------------|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

При старте `backend` автоматически выполняется `alembic upgrade head`.

### Frontend в Docker

По умолчанию используется **`Dockerfile.dev`** (`npm start` + volume `frontend/src`) — изменения в React видны после сохранения файла, без пересборки образа.

Production-сборка (nginx + статика): `docker compose build --build-arg` с `frontend/Dockerfile` или смените `dockerfile:` в `docker-compose.yml` на `Dockerfile` и выполните:

```bash
docker compose build frontend && docker compose up -d frontend
```

Если в UI «застряла» старая версия — жёсткое обновление (Ctrl+Shift+R) или пересборка frontend, как выше.

### Полезные команды

```bash
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f frontend
docker compose restart backend
docker compose down -v   # с удалением volumes (очистка БД)
```

### Первый пользователь (админ)

Если в БД нет пользователей — зарегистрируйте админа через API или скрипт инициализации (см. `backend/init.sql` при наличии seed).

Логин в UI: http://localhost:3000/login

## Вариант 2: Локальная разработка

### 1. Инфраструктура

Поднять только БД и Redis:

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://med_user:med_pass@localhost:5432/med_center
export REDIS_URL=redis://localhost:6379/0
export CELERY_BROKER_URL=redis://localhost:6379/1
export CELERY_RESULT_BACKEND=redis://localhost:6379/2
export SECRET_KEY=development-secret-key
export ALLOW_PUBLIC_ROOM_DISPLAY=True

alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

В отдельных терминалах:

```bash
# Celery worker
celery -A app.tasks.celery_worker.celery_app worker --loglevel=info --pool=solo

# Celery beat
celery -A app.tasks.celery_worker.celery_app beat --loglevel=info
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Откроется http://localhost:3000. Запросы `/api/*` проксируются на `localhost:8000` (`setupProxy.js`).

Опционально `.env` в `frontend/` (см. `.env.example`):

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

### Скрипт setup.sh

```bash
./setup.sh
```

Устанавливает venv, pip-зависимости, пробует миграции, `npm install`. Запуск сервисов — вручную или через compose.

## Проверка работоспособности

1. http://localhost:8000/docs — Swagger открывается.
2. http://localhost:3000/login — форма входа.
3. http://localhost:3000/room — экран палаты без логина (если `ALLOW_PUBLIC_ROOM_DISPLAY=True`).
4. После входа медсестры: http://localhost:3000/nurse/appointments

## Сборка frontend для продакшена

```bash
cd frontend
npm run build
```

Артефакт: `frontend/build/`. Статику отдаёт nginx или `frontend` container.

## Типичные проблемы

| Симптом | Решение |
|---------|---------|
| `connection refused` к postgres | Дождаться healthcheck; проверить `DATABASE_URL` |
| 401 на API | Перелогиниться; проверить `SECRET_KEY` |
| Нет данных мониторинга | Проверить `MONITORING_API_URL`, доступность с хоста/контейнера |
| Celery не шлёт в MAX | Задать `MAX_BOT_TOKEN`, `MAX_ALERT_CHAT_ID` |
| CORS | Добавить origin в `BACKEND_CORS_ORIGINS` |

См. [CONFIGURATION.md](./CONFIGURATION.md).
