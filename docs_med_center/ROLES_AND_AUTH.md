# Роли и авторизация

## Роли

| Роль | Доступ в UI | Стартовый маршрут |
|------|-------------|------------------|
| **admin** | Верхняя панель + все кабинеты + `/register` | `/register` |
| **nurse** | Станция медсестры | `/nurse/appointments` |
| **doctor** | Кабинет врача | `/doctor/patients` |

Админ может переходить в кабинет медсестры, врача и публичный экран палаты через `AdminHeader`.

## JWT

1. `POST /api/v1/auth/login` с `username` / `password`.
2. Ответ: `{ "access_token": "...", "token_type": "bearer" }`.
3. Frontend сохраняет токен в `localStorage` (`auth_token`).
4. Axios добавляет заголовок `Authorization: Bearer ...` на каждый запрос.

Время жизни: `ACCESS_TOKEN_EXPIRE_MINUTES` (по умолчанию 240 мин).

## Защита маршрутов (frontend)

`ProtectedRoute` в `App.tsx` проверяет роль и редиректит при несовпадении.

| Маршрут | Роли |
|---------|------|
| `/register` | admin |
| `/nurse/appointments` | admin, nurse |
| `/doctor/patients` | admin, doctor |
| `/archived` | admin, nurse, doctor |
| `/login` | все (гости) |
| `/room`, `/room/:monitorId` | **без входа** |

## Публичный режим экрана палаты

При **`ALLOW_PUBLIC_ROOM_DISPLAY=True`** (по умолчанию в dev) следующие endpoint'ы доступны **без JWT** через dependency `require_auth_or_public_display`:

- `GET /patients/` — только активные пациенты
- `GET /rooms/`
- `GET /monitoring/*` (дашборд, атмосфера, …)

Запись данных (назначения, выписка, пороги) всегда требует авторизации.

Для закрытого контура установите `ALLOW_PUBLIC_ROOM_DISPLAY=False` — тогда монитору в палате понадобится сервисный токен или отдельный механизм.

## Флажки пациента (экран палаты)

Не роли пользователя, а **статусы на койке** (поля в `patients`):

| Флаг | Смысл в UI |
|------|------------|
| Белый | Всё в порядке |
| Жёлтый | Риск падения |
| Оранжевый | Инфекция |
| Красный | Аллергия |
| Зелёный | Диета |

Редактирование: `PATCH /patients/{id}/feature-flags` (медсестра/врач в карточке пациента).

## Практические заметки

- После истечения токена UI получает **401** — нужен повторный вход.
- WebSocket передаёт токен в query: `?token=...`.
- Не коммитить `SECRET_KEY` и `MAX_BOT_TOKEN` в репозиторий.

См. [CONFIGURATION.md](./CONFIGURATION.md).
