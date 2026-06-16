# Frontend

React 18 + TypeScript, Create React App. Сборка: `npm run build` → `frontend/build/`.

Шрифт интерфейса: **Cygre** (`src/fonts.css`, `src/index.css`).

---

## Структура

```
frontend/src/
├── App.tsx                 # Маршруты, ProtectedRoute
├── MainLayout.tsx          # Общий layout защищённых страниц
├── index.tsx, index.css
├── pages/
│   ├── LoginPage.tsx
│   ├── AdminRegistrationPage.tsx
│   ├── NurseDashboardPage.tsx
│   ├── DoctorDashboardPage.tsx
│   └── RoomDisplayPage.tsx     # Публичный экран + legacy (?legacy=1)
├── components/
│   ├── nurse-station/          # Пациенты, 530н, назначения, палаты, архив
│   ├── doctor-station/         # Назначения, отчёты
│   ├── bracelet-monitoring/    # Обзор браслетов, пороги, непривязанные
│   ├── room-display/           # BedSchematic (legacy)
│   ├── shared/                 # ArchivedPatientsPanel
│   ├── common/                 # AdminHeader, Button, Card, Toast
│   ├── medical-form/           # Ввод АД, температуры
│   └── patient-room/           # Welcome, StartButton (планшет палаты)
├── hooks/
│   ├── useAuth.ts
│   ├── usePatients.ts
│   ├── useBraceletOverview.ts
│   └── useWebSocket.ts
├── services/
│   ├── api.ts              # Axios, все REST-вызовы
│   └── printService.ts     # Печать 530н
├── types/                  # Patient, Room, monitoring, braceletAlerts, …
└── utils/
    ├── monitoringDisplay.ts
    ├── patientFlags.ts
    ├── braceletThresholdDefaults.ts
    └── prescriptionNotifications.ts
```

Статика и иконки: `frontend/public/images/` (`pulse.png`, `temp-chel.png`, `chelik.png`, …).

---

## Маршрутизация

Определена в `App.tsx`:

| Путь | Компонент | Auth |
|------|-----------|------|
| `/login` | LoginPage | нет |
| `/register` | AdminRegistrationPage | admin |
| `/nurse/appointments` | NurseDashboardPage | admin, nurse |
| `/doctor/patients` | DoctorDashboardPage | admin, doctor |
| `/archived` | ArchivedPatients | admin, nurse, doctor |
| `/room`, `/room/:monitorId` | RoomDisplayPage | **нет** |
| `/` | → `/login` | |

`ProtectedRoute` проверяет роль и редиректит на домашнюю страницу роли.

**Deep-link:** вкладки и вложенные состояния синхронизируются с query-параметрами (`tab`, `patient`, `card`, `cardTab`, `subtab`, `report`, `room`). Хуки: `hooks/useUrlSearchState.ts`, константы: `utils/urlTabs.ts`.

| Маршрут | Пример |
|---------|--------|
| Медсестра | `/nurse/appointments?tab=bracelets` |
| Врач | `/doctor/patients?tab=prescriptions&patient=5` |
| Карточка | `?tab=patients&card=12&cardTab=prescriptions` |
| Палата | `/room?room=2` |

---

## API-клиент

`services/api.ts` — класс `ApiService`, экспорт `apiService`.

- Базовый URL: `/api/v1` (через `setupProxy.js` в dev)
- Токен: `localStorage.auth_token` → заголовок `Authorization: Bearer …`
- При 401 — редирект на login (через interceptor)

Основные группы методов:

| Группа | Методы |
|--------|--------|
| Auth | `login`, `registerUser`, `getCurrentUser` |
| Patients | `getPatients`, `archivePatient`, `updatePatientFeatureFlags`, … |
| Rooms | `getRooms`, `getRoom` |
| Medical | observations, procedures, prescriptions, form530n |
| Monitoring | `getMonitoringDashboard`, `getMonitoringHealth` |
| Bracelets | `getBraceletOverview`, `assignBracelet`, thresholds, check/test-max |
| 1С | `syncWith1C` |

Типы ответов — в `src/types/`.

---

## Станция медсестры

`NurseDashboardPage.tsx` — горизонтальные вкладки:

| Вкладка | Компоненты |
|---------|------------|
| Пациенты | `PatientList`, `PatientCard` (модалка) |
| Наблюдения | `ObservationsTable` |
| Форма 530н | `MedicalForm530n` |
| Назначения | `AppointmentsView` |
| Браслеты | `BraceletAlertsPanel`, `UnassignedBraceletsBar`, пороги |
| Архив | `ArchivedPatientsPanel` |
| Палаты | `NurseRoomMonitor` |

`usePatients` — загрузка пациентов + авто-sync 1С раз в час.

`useWebSocket` — уведомления о назначениях → `NotificationToast`.

---

## Кабинет врача

`DoctorDashboardPage.tsx`:

| Вкладка | Компоненты |
|---------|------------|
| Обзор | KPI-карточки, мини-список |
| Пациенты | Сетка карточек → `PatientCard` |
| Назначения | `PrescriptionsForm`, `PrescriptionsList` |
| Отчёты | `DoctorReportsView` (CSV-экспорт) |
| Архив | `ArchivedPatientsPanel` |

---

## Мониторинг браслетов

`components/bracelet-monitoring/`:

| Компонент | Назначение |
|-----------|------------|
| `BraceletAlertsPanel` | Список пациентов с виталами и статусом алертов |
| `PatientBraceletCard` | Карточка одного пациента |
| `PatientVitalThresholdsModal` | Редактор порогов |
| `MetricThresholdFields` | Поля min/max по метрике |
| `UnassignedBraceletsBar` | Непривязанные BLE-устройства |
| `VitalMetricBadge` | Бейдж уровня (normal/warning/critical) |

Логика порогов на клиенте: `utils/braceletThresholdDefaults.ts` — сравнение effective vs defaults, подсказки «сейчас свои / стандарт».

Хук `useBraceletOverview` — polling ~30 с.

---

## Публичный экран палаты

См. отдельный документ [ROOM_DISPLAY.md](./ROOM_DISPLAY.md).

Кратко:

- По умолчанию — **v2 layout** (`RoomDisplayPageV2.css`)
- Legacy: `?legacy=1` — тёмная тема, `BedSchematic`
- Опрос: `getRooms()` + `getMonitoringDashboard()` каждые 3 с
- Полная перезагрузка страницы: 15 мин

---

## Стили и UI

- CSS-модули по компонентам (`*.css` рядом с `*.tsx`)
- MUI используется точечно (DataGrid, иконки)
- Цветовые акценты: медсестра — зелёный, врач — синий, палата v2 — светлый fullscreen

### Флажки пациента

`utils/patientFlags.ts`:

- `activePatientFlagStatuses()` — только включённые флаги
- `bedFlagsFromPatient()` — для legacy BedSchematic

---

## Dev-прокси

`setupProxy.js`:

```
/api → http://backend:8000  (в Docker)
/api → http://localhost:8000  (локально)
```

Переменная `API_PROXY_TARGET` в `docker-compose.yml`.

---

## Скрипты

```bash
npm start          # dev-сервер :3000
npm run build      # production build
npm run type-check # tsc --noEmit
npm run lint       # eslint
```

---

## Связанные документы

- [ROOM_DISPLAY.md](./ROOM_DISPLAY.md)
- [SITEMAP.md](./SITEMAP.md)
- [API.md](./API.md)
- [SETUP.md](./SETUP.md)
