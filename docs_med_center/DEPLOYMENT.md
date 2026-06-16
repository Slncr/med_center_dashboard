# Развёртывание

## Сборка образов

```bash
docker compose build
# или отдельно:
docker build -t med-center-backend ./backend
docker build -t med-center-frontend ./frontend
```

Frontend Dockerfile собирает `npm run build` и отдаёт статику через nginx (см. `frontend/Dockerfile`).

## Минимальный чеклист продакшена

### Секреты и безопасность

- [ ] Сменить `SECRET_KEY` на криптостойкий случайный ключ
- [ ] `DEBUG=False`
- [ ] Ограничить `BACKEND_CORS_ORIGINS` доменом фронта
- [ ] Решить, нужен ли `ALLOW_PUBLIC_ROOM_DISPLAY` на мониторах в палатах
- [ ] Пароли PostgreSQL не по умолчанию из compose
- [ ] `MAX_BOT_TOKEN` и др. — только через secrets, не в git

### База данных

- [ ] `alembic upgrade head` при каждом релизе
- [ ] Резервное копирование PostgreSQL
- [ ] Persistent volume для `postgres_data`

### Redis и Celery

- [ ] Worker + Beat запущены (два контейнера или один supervisor)
- [ ] Доступ worker к `MONITORING_API_URL` и 1С из сети Docker/хоста

### Сеть

- [ ] HTTPS на reverse proxy (nginx/traefik)
- [ ] WebSocket upgrade для `/api/v1/ws/`
- [ ] Таймауты proxy для печати формы 530н при необходимости

### Frontend

- [ ] Статика из `build/` или образ `frontend`
- [ ] `REACT_APP_*` заданы на этапе **build**, если API не на том же origin
- [ ] Если API на том же домене — прокси `/api` → backend

### Мониторинг и алерты

- [ ] Проверить `MONITORING_API_URL` с production-сети
- [ ] Настроить MAX и протестировать `test-max`
- [ ] Логи celery на ошибки 1С

## Reverse proxy (пример nginx)

```nginx
server {
    listen 443 ssl;
    server_name dashboard.example.com;

    location / {
        root /var/www/med-center/build;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/v1/ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Миграции при деплое

```bash
docker compose exec backend alembic upgrade head
```

Или встроенный шаг в `command` backend (как в dev compose).

## Health checks

- Backend: `GET /docs` или dedicated `/health`
- Postgres/Redis: healthcheck в compose
- Внешний uptime на URL фронта и API

## Откат

1. Откатить образы на предыдущий tag.
2. При обратно несовместимых миграциях — план отката Alembic (редко; готовить заранее).

## Связанные документы

- [SETUP.md](./SETUP.md) — локальный запуск
- [CONFIGURATION.md](./CONFIGURATION.md) — переменные
- [ARCHITECTURE.md](./ARCHITECTURE.md) — компоненты
