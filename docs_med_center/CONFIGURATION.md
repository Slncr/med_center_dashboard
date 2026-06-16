# Конфигурация

Переменные читаются из окружения (Docker Compose, `.env` в корне для backend через Pydantic `Settings`).

## Backend

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `DATABASE_URL` | `postgresql://med_user:med_pass@postgres:5432/med_center` | PostgreSQL |
| `REDIS_URL` | `redis://redis:6379/0` | Redis (общий) |
| `CELERY_BROKER_URL` | `redis://redis:6379/1` | Очередь Celery |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/2` | Результаты Celery |
| `SECRET_KEY` | *(в compose — dev)* | Подпись JWT; **обязательно сменить в prod** |
| `ALGORITHM` | `HS256` | Алгоритм JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `240` | Время жизни токена |
| `DEBUG` | `True` | Режим отладки FastAPI |
| `ENVIRONMENT` | `development` | Метка окружения |
| `BACKEND_CORS_ORIGINS` | см. config | Список origin через запятую |
| `ALLOW_PUBLIC_ROOM_DISPLAY` | `True` | Публичный read-only доступ к палатам/мониторингу без JWT |

### 1С

| Переменная | Описание |
|------------|----------|
| `ONEC_BASE_URL` | Базовый URL HTTP-сервиса 1С |
| `ONEC_USER` | Basic auth (опционально) |
| `ONEC_PASSWORD` | Basic auth (опционально) |
| `ONEC_TIMEOUT` | Таймаут запросов, сек |

### Мониторинг (браслеты + атмосфера)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `MONITORING_API_URL` | `http://172.191.7.50/api` | API BLE/ATM |
| `MONITORING_API_TIMEOUT` | `5` | Таймаут HTTP, сек |

### Оповещения браслетов → MAX

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `BRACELET_ALERTS_ENABLED` | `True` | Включить фоновую проверку |
| `BRACELET_ALERT_CHECK_INTERVAL_SEC` | `60` | Период Beat + проверки |
| `BRACELET_ALERT_COOLDOWN_SEC` | `900` | Пауза повторного алерта по метрике (Redis) |
| `MAX_BOT_TOKEN` | — | Токен бота MAX |
| `MAX_ALERT_CHAT_ID` | — | ID чата для алертов |
| `MAX_API_BASE_URL` | `https://platform-api.max.ru` | База API MAX |
| `MAX_API_TIMEOUT` | `10` | Таймаут, сек |

Пустые `MAX_BOT_TOKEN` / `MAX_ALERT_CHAT_ID` (`""`) обрабатываются как `None` (отправка отключена).

## Frontend

Файл `frontend/.env` (пример в корневом `.env.example`):

| Переменная | Описание |
|------------|----------|
| `REACT_APP_API_URL` | Базовый URL API (если без прокси) |
| `REACT_APP_WS_URL` | WebSocket (например `ws://host/ws`) |
| `REACT_APP_ENVIRONMENT` | Метка окружения |

В Docker dev обычно достаточно прокси CRA на `/api` без отдельного `REACT_APP_API_URL`.

## Docker Compose

Основные переменные заданы в `docker-compose.yml` для сервисов `backend`, `celery`, `celery-beat`. Для продакшена вынесите секреты в `.env` (не коммитить) и подключите через `env_file:`.

## Пример `.env` для продакшена (фрагмент)

```env
SECRET_KEY=<случайная-длинная-строка>
DEBUG=False
ALLOW_PUBLIC_ROOM_DISPLAY=True
BACKEND_CORS_ORIGINS=https://dashboard.example.com
MONITORING_API_URL=http://monitoring.internal/api
MAX_BOT_TOKEN=...
MAX_ALERT_CHAT_ID=123456789
BRACELET_ALERTS_ENABLED=True
```

См. также [INTEGRATIONS.md](./INTEGRATIONS.md) и [DEPLOYMENT.md](./DEPLOYMENT.md).
