import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { formatApiError, useOperatingRoomBoard } from '../hooks/useOperatingRoomBoard';
import { OR_STATUS_OPTIONS, OrStatus } from '../utils/operatingRoomStatus';
import type { OrAtmosphereSource, OrDisplaySettings } from '../types/operatingRoom';
import { appConfirm } from '../context/AppDialogContext';
import './OperatingRoomAdminPage.css';

const OperatingRoomAdminPage: React.FC = () => {
  const {
    status,
    display,
    announcements,
    atmosphereConfig,
    atmosphere,
    atmosphereError,
    loading,
    refreshAtmosphere,
    setStatus,
    setDisplay,
    setAnnouncements,
    setAtmosphereConfig,
    setAtmosphere,
    setAtmosphereError,
  } = useOperatingRoomBoard();

  const [statusBusy, setStatusBusy] = useState(false);
  const [displayBusy, setDisplayBusy] = useState(false);
  const [atmBusy, setAtmBusy] = useState(false);
  const [annBusy, setAnnBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [announcementText, setAnnouncementText] = useState('');
  const [atmDirty, setAtmDirty] = useState(false);
  const [atmSource, setAtmSource] = useState<OrAtmosphereSource>('manual');
  const [monitorZone, setMonitorZone] = useState('');
  const [temp, setTemp] = useState('');
  const [hum, setHum] = useState('');
  const [press, setPress] = useState('');

  useEffect(() => {
    if (loading || atmDirty) return;
    setAtmSource(atmosphereConfig.source);
    setMonitorZone(
      atmosphereConfig.monitor_zone == null ? '' : String(atmosphereConfig.monitor_zone),
    );
    setTemp(atmosphereConfig.temp == null ? '' : String(atmosphereConfig.temp));
    setHum(atmosphereConfig.hum == null ? '' : String(atmosphereConfig.hum));
    setPress(atmosphereConfig.press == null ? '' : String(atmosphereConfig.press));
  }, [atmosphereConfig, atmDirty, loading]);

  const flash = (ok: string | null, err: string | null = null) => {
    setMessage(ok);
    setError(err);
  };

  const handleStatus = async (next: OrStatus) => {
    if (next === status || statusBusy) return;
    const prev = status;
    setStatusBusy(true);
    setStatus(next);
    try {
      const updated = await apiService.setOperatingRoomStatus(next);
      if (updated.status) setStatus(updated.status as OrStatus);
      flash(`Статус: ${OR_STATUS_OPTIONS.find((o) => o.id === next)?.tabletLabel ?? next}`);
    } catch (err: unknown) {
      setStatus(prev);
      flash(null, formatApiError(err, 'Не удалось сменить статус'));
    } finally {
      setStatusBusy(false);
    }
  };

  const handleToggle = async (key: keyof OrDisplaySettings) => {
    if (displayBusy) return;
    const prev = display;
    const nextValue = !display[key];
    setDisplayBusy(true);
    setDisplay({ ...display, [key]: nextValue });
    try {
      const updated = await apiService.updateOperatingRoomDisplay({ [key]: nextValue });
      setDisplay(updated);
      flash('Настройки экрана сохранены');
    } catch (err: unknown) {
      setDisplay(prev);
      flash(null, formatApiError(err, 'Не удалось сохранить настройки'));
    } finally {
      setDisplayBusy(false);
    }
  };

  const parseOptionalNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const handleAtmosphereSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAtmBusy(true);
    try {
      const payload = {
        source: atmSource,
        monitor_zone: parseOptionalNumber(monitorZone),
        temp: parseOptionalNumber(temp),
        hum: parseOptionalNumber(hum),
        press: parseOptionalNumber(press),
      };
      const updated = await apiService.updateOperatingRoomAtmosphere(payload);
      setAtmosphereConfig(updated);
      setAtmDirty(false);
      if (updated.source === 'manual') {
        setAtmosphere({
          zone: updated.monitor_zone,
          temp: updated.temp,
          hum: updated.hum,
          press: updated.press,
        });
        setAtmosphereError(null);
        flash('Параметры атмосферы сохранены');
      } else {
        try {
          const live = await refreshAtmosphere();
          flash(
            live.atmosphere && (live.atmosphere.temp != null || live.atmosphere.hum != null)
              ? `Зона ${updated.monitor_zone}: t ${live.atmosphere.temp ?? '—'} / h ${live.atmosphere.hum ?? '—'} / p ${live.atmosphere.press ?? '—'}`
              : `Зона ${updated.monitor_zone} сохранена${live.atmosphere_error ? `: ${live.atmosphere_error}` : ''}`,
          );
        } catch (err: unknown) {
          flash(
            `Зона ${updated.monitor_zone} сохранена`,
            formatApiError(err, 'Не удалось получить показания датчиков'),
          );
        }
      }
    } catch (err: unknown) {
      flash(null, formatApiError(err, 'Не удалось сохранить атмосферу'));
    } finally {
      setAtmBusy(false);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = announcementText.trim();
    if (!text) return;
    setAnnBusy(true);
    try {
      const created = await apiService.createOperatingRoomAnnouncement(text);
      setAnnouncements([created, ...announcements.filter((a) => a.id !== created.id)]);
      setAnnouncementText('');
      flash('Объявление добавлено');
    } catch (err: unknown) {
      flash(null, formatApiError(err, 'Не удалось добавить объявление'));
    } finally {
      setAnnBusy(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const ok = await appConfirm('Удалить объявление?');
    if (!ok) return;
    setAnnBusy(true);
    const prev = announcements;
    setAnnouncements(announcements.filter((item) => item.id !== id));
    try {
      await apiService.deleteOperatingRoomAnnouncement(id);
      flash('Объявление удалено');
    } catch (err: unknown) {
      setAnnouncements(prev);
      flash(null, formatApiError(err, 'Не удалось удалить объявление'));
    } finally {
      setAnnBusy(false);
    }
  };

  const savedZoneLabel =
    atmosphereConfig.source === 'sensor'
      ? `Зона ${atmosphereConfig.monitor_zone ?? '—'} · сейчас: t ${atmosphere?.temp ?? '—'} / h ${atmosphere?.hum ?? '—'} / p ${atmosphere?.press ?? '—'}`
      : `Вручную · t ${atmosphere?.temp ?? atmosphereConfig.temp ?? '—'} / h ${atmosphere?.hum ?? atmosphereConfig.hum ?? '—'} / p ${atmosphere?.press ?? atmosphereConfig.press ?? '—'}`;

  return (
    <div className="or-admin">
      <header className="or-admin__header">
        <div>
          <h1 className="or-admin__title">Операционная</h1>
          <p className="or-admin__subtitle">
            Управление статусом, блоками инфоэкрана, атмосферой и объявлениями
          </p>
        </div>
        <Link className="or-admin__link" to="/or/info" target="_blank" rel="noreferrer">
          Открыть инфоэкран ↗
        </Link>
      </header>

      {(message || error) && (
        <p className={`or-admin__message ${error ? 'or-admin__message--err' : 'or-admin__message--ok'}`}>
          {error || message}
        </p>
      )}

      <div className="or-admin__grid">
        <section className="or-admin__card">
          <h2 className="or-admin__card-title">Статус на экране</h2>
          <p className="or-admin__card-hint">Текущий: {OR_STATUS_OPTIONS.find((o) => o.id === status)?.tabletLabel}</p>
          <div className="or-admin__status-grid">
            {OR_STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`or-admin__status-btn ${status === option.id ? 'is-active' : ''}`}
                style={{ ['--or-status-color' as string]: option.color }}
                disabled={statusBusy}
                onClick={() => void handleStatus(option.id)}
              >
                <img className="or-admin__status-icon" src={option.iconColor} alt="" />
                <span className="or-admin__status-label">{option.tabletLabel}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="or-admin__card">
          <h2 className="or-admin__card-title">Что показывать на инфоэкране</h2>
          <div className="or-admin__toggles">
            {(
              [
                ['show_stats', 'Сводка по пациентам'],
                ['show_atmosphere', 'Параметры атмосферы'],
                ['show_announcements', 'Объявления и информация'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="or-admin__toggle">
                <span>{label}</span>
                <span className="or-admin__switch">
                  <input
                    type="checkbox"
                    checked={display[key]}
                    disabled={displayBusy}
                    onChange={() => void handleToggle(key)}
                  />
                  <span className="or-admin__switch-slider" />
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="or-admin__card">
          <h2 className="or-admin__card-title">Параметры атмосферы</h2>
          <p className="or-admin__card-hint">
            {savedZoneLabel}
            {atmosphereError ? ` · ${atmosphereError}` : ''}
          </p>
          <form className="or-admin__form" onSubmit={handleAtmosphereSave}>
            <div className="or-admin__field">
              <label htmlFor="or-atm-source">Источник</label>
              <select
                id="or-atm-source"
                value={atmSource}
                onChange={(e) => {
                  setAtmDirty(true);
                  setAtmSource(e.target.value as OrAtmosphereSource);
                }}
              >
                <option value="manual">Вручную</option>
                <option value="sensor">Датчики (зона мониторинга)</option>
              </select>
            </div>

            {atmSource === 'sensor' ? (
              <div className="or-admin__field">
                <label htmlFor="or-atm-zone">Зона мониторинга</label>
                <input
                  id="or-atm-zone"
                  type="number"
                  min={1}
                  value={monitorZone}
                  onChange={(e) => {
                    setAtmDirty(true);
                    setMonitorZone(e.target.value);
                  }}
                  placeholder="например, 1"
                  required
                />
              </div>
            ) : (
              <div className="or-admin__row">
                <div className="or-admin__field">
                  <label htmlFor="or-atm-temp">Температура, °C</label>
                  <input
                    id="or-atm-temp"
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => {
                      setAtmDirty(true);
                      setTemp(e.target.value);
                    }}
                  />
                </div>
                <div className="or-admin__field">
                  <label htmlFor="or-atm-hum">Влажность, %</label>
                  <input
                    id="or-atm-hum"
                    type="number"
                    step="1"
                    value={hum}
                    onChange={(e) => {
                      setAtmDirty(true);
                      setHum(e.target.value);
                    }}
                  />
                </div>
                <div className="or-admin__field">
                  <label htmlFor="or-atm-press">Давление, мм</label>
                  <input
                    id="or-atm-press"
                    type="number"
                    step="1"
                    value={press}
                    onChange={(e) => {
                      setAtmDirty(true);
                      setPress(e.target.value);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="or-admin__actions">
              <button className="or-admin__btn" type="submit" disabled={atmBusy}>
                Сохранить атмосферу
              </button>
            </div>
          </form>
        </section>

        <section className="or-admin__card">
          <h2 className="or-admin__card-title">Объявления ({announcements.length})</h2>
          <form className="or-admin__form" onSubmit={handleAddAnnouncement}>
            <div className="or-admin__field">
              <label htmlFor="or-announcement">Новое объявление</label>
              <textarea
                id="or-announcement"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Текст для инфоэкрана…"
                maxLength={500}
              />
            </div>
            <div className="or-admin__actions">
              <button
                className="or-admin__btn"
                type="submit"
                disabled={annBusy || !announcementText.trim()}
              >
                Добавить
              </button>
            </div>
          </form>

          <div className="or-admin__list">
            {announcements.length === 0 ? (
              <p className="or-admin__preview">Пока нет объявлений</p>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="or-admin__announcement">
                  <div>
                    <p className="or-admin__announcement-text">{item.text}</p>
                    <p className="or-admin__announcement-meta">
                      {new Date(item.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="or-admin__btn or-admin__btn--danger"
                    disabled={annBusy}
                    onClick={() => void handleDeleteAnnouncement(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default OperatingRoomAdminPage;
