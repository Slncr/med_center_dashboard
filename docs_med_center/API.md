# Обзор API

Базовый префикс: **`/api/v1`**

Интерактивная документация: **http://localhost:8000/docs** (Swagger UI).

Авторизация по умолчанию: заголовок `Authorization: Bearer <access_token>` (кроме публичных endpoint'ов — см. [ROLES_AND_AUTH.md](./ROLES_AND_AUTH.md)).

## Аутентификация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/login` | Логин → JWT |
| GET | `/auth/users/me` | Текущий пользователь |
| POST | `/auth/register` | Регистрация (ограничено на backend) |

## Пользователи (admin)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/users/` | Список пользователей |
| POST | `/users/register` | Создать врача/медсестру |
| GET | `/users/me` | Профиль |

## Пациенты

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/patients/` | public* / user | Активные пациенты |
| GET | `/patients/archived` | user | Архив (выписанные) |
| GET | `/patients/{id}` | user | Карточка пациента |
| POST | `/patients/{id}/select` | user | Выбор для планшета палаты |
| PATCH | `/patients/{id}/archive` | user | Выписка |
| PATCH | `/patients/{id}/restore` | user | Восстановление из архива |
| PATCH | `/patients/{id}/feature-flags` | user | Флажки на экране палаты |

\* public — при `ALLOW_PUBLIC_ROOM_DISPLAY=True` без токена.

## Палаты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/rooms/` | Палаты с койками и пациентами |

## Медицинские данные (`/medical`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST/PUT/DELETE | `/medical/observations/...` | Наблюдения |
| GET/PATCH/POST | `/medical/procedures/...` | Процедуры |
| GET/POST | `/medical/prescriptions/...` | Назначения (в т.ч. batch) |
| POST | `/medical/prescriptions/{id}/execute` | Выполнить назначение |
| PATCH | `/medical/prescriptions/{id}/cancel` | Отменить |
| GET | `/medical/prescriptions/packages/patient/{id}` | Пакеты назначений |
| GET | `/medical/form-530n/{patient_id}` | Данные формы 530/н |
| GET | `/medical/form-530n/{patient_id}/print` | HTML/PDF для печати |

## Мониторинг (`/monitoring`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/monitoring/health` | Health внешнего API |
| GET | `/monitoring/dashboard?room_id=` | Дашборд палаты (койки + BLE + атмосфера) |
| GET | `/monitoring/state` | Состояние устройств |
| GET | `/monitoring/atm/{room}` | Атмосфера по зоне |
| GET | `/monitoring/zones` | Доступные зоны ATM |
| PATCH | `/monitoring/rooms/{room_id}/zone` | Привязка зоны к палате |

## Браслеты (`/bracelet-alerts`)

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/bracelet-alerts/overview` | nurse, admin | Сводка для UI |
| GET | `/bracelet-alerts/defaults` | nurse, admin | Пороги по умолчанию |
| GET/PUT/DELETE | `/bracelet-alerts/patients/{id}/thresholds` | nurse, admin | Пороги пациента |
| POST | `/bracelet-alerts/assign-bracelet` | nurse, admin | Привязать MAC |
| POST | `/bracelet-alerts/distribute-bracelets` | nurse, admin | Автораспределение |
| DELETE | `/bracelet-alerts/patients/{id}/bracelet` | nurse, admin | Отвязать |
| POST | `/bracelet-alerts/check` | nurse, admin | Ручная проверка + MAX |
| POST | `/bracelet-alerts/test-max` | nurse, admin | Тест сообщения MAX |

## Интеграция 1С (`/integration`)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/integration/1c/sync` | Импорт стационарных пациентов |
| GET | `/integration/1c/patients` | Заглушка (используйте sync) |

## WebSocket

| Путь | Описание |
|------|----------|
| `WS /api/v1/ws/{room_id}?token=<jwt>` | События назначений для станции |

Типы сообщений (примеры): `prescription_created`, `prescriptions_created`, `prescription_cancelled`, `prescription_completed`.

## Health

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Проверка живости backend (вне v1, см. `main.py`) |

## Коды ответов

| Код | Смысл |
|-----|--------|
| 200 / 201 | Успех |
| 401 | Нет или неверный токен |
| 403 | Недостаточно прав |
| 404 | Не найдено |
| 422 | Ошибка валидации тела запроса |
| 500 | Ошибка сервера / внешней интеграции |

Полные схемы request/response — в Swagger и `backend/app/schemas/`.
