import React from 'react';
import { useOperatingRoomBoard } from '../hooks/useOperatingRoomBoard';
import { OR_STATUS_BY_ID } from '../utils/operatingRoomStatus';
import type { OrStatsView } from '../types/operatingRoom';
import './OperatingRoomInfoPage.css';

const img = (name: string) => `${process.env.PUBLIC_URL}/images/${name}`;

const STATUS_SOFT: Record<string, string> = {
  surgery: '#fde8e8',
  free: '#eaf6df',
  cleaning: '#e3f5fc',
  sterilization: '#f1e9fb',
};

type StatDef = {
  key: keyof OrStatsView;
  label: string;
  desc: string;
  icon: string;
};

const STATS: StatDef[] = [
  { key: 'active_patients', label: 'Активные пациенты', desc: 'на лечении', icon: 'chelik.png' },
  {
    key: 'awaiting_examination',
    label: 'Ожидают осмотра',
    desc: 'нет назначений',
    icon: 'w8.png',
  },
  {
    key: 'active_prescriptions',
    label: 'Назначений сегодня',
    desc: 'за 24 часа',
    icon: 'pen.png',
  },
  {
    key: 'completed_prescriptions',
    label: 'Выполнено назначений',
    desc: 'за 24 часа',
    icon: 'complete.png',
  },
  {
    key: 'ready_for_discharge',
    label: 'Готовы к выписке',
    desc: 'план выполнен',
    icon: 'complete.png',
  },
];

const ATM = [
  {
    key: 'temp' as const,
    label: 'Температура',
    icon: 'temperatura.png',
    norm: 'Норма 22–26 °C',
    format: (v: number) => `${v.toFixed(1)} °C`,
  },
  {
    key: 'hum' as const,
    label: 'Влажность',
    icon: 'vlajnost.png',
    norm: 'Норма 40–60 %',
    format: (v: number) => `${Math.round(v)} %`,
  },
  {
    key: 'press' as const,
    label: 'Давление',
    icon: 'davlenie.png',
    norm: 'Норма 1000–1025 мм',
    format: (v: number) => `${Math.round(v)} мм`,
  },
];

function formatAnnouncementTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${hh}:${mm} ${dd}.${mo}.${yyyy}`;
}

const OperatingRoomInfoPage: React.FC = () => {
  const { status, display, announcements, atmosphere, atmosphereError, stats } =
    useOperatingRoomBoard({ withStats: true });
  const option = OR_STATUS_BY_ID[status];
  const soft = STATUS_SOFT[status] ?? '#f3f4f6';

  return (
    <div
      className="or-info"
      style={
        {
          ['--or-status-color' as string]: option.color,
          ['--or-status-soft' as string]: soft,
        } as React.CSSProperties
      }
    >
      <header className="or-info__status">
        <img className="or-info__status-icon" src={option.iconColor} alt="" />
        <div className="or-info__status-copy">
          <h1 className="or-info__status-title">{option.displayLabel}</h1>
          <p className="or-info__status-subtitle">{option.displaySubtitle}</p>
        </div>
      </header>

      {display.show_stats && (
        <section className="or-info__stats" aria-label="Сводка по центру">
          {STATS.map((item) => (
            <article key={item.key} className="or-info__stat-card">
              <h2 className="or-info__stat-label">{item.label}</h2>
              <div className="or-info__stat-body">
                <img className="or-info__stat-icon" src={img(item.icon)} alt="" />
                <div className="or-info__stat-metrics">
                  <span className="or-info__stat-value">{stats[item.key]}</span>
                  <span className="or-info__stat-desc">{item.desc}</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {display.show_atmosphere && (
        <section className="or-info__section" aria-label="Параметры атмосферы">
          <h2 className="or-info__section-title">Параметры атмосферы</h2>
          <div className="or-info__atm-row">
            {ATM.map((item) => {
              const raw = atmosphere?.[item.key];
              const n = raw == null ? null : Number(raw);
              const value =
                n == null || Number.isNaN(n) ? '—' : item.format(n);
              return (
                <article key={item.key} className="or-info__atm-card">
                  <img className="or-info__atm-icon" src={img(item.icon)} alt="" />
                  <div className="or-info__atm-content">
                    <span className="or-info__atm-label">{item.label}</span>
                    <strong className="or-info__atm-value">{value}</strong>
                    <span className="or-info__atm-meta">{item.norm}</span>
                  </div>
                </article>
              );
            })}
          </div>
          {atmosphereError && <p className="or-info__error">{atmosphereError}</p>}
        </section>
      )}

      {display.show_announcements && (
        <section className="or-info__section" aria-label="Объявления и информация">
          <h2 className="or-info__section-title">Объявления и информация</h2>
          <div className="or-info__announcements">
            {announcements.length === 0 ? (
              <div className="or-info__empty">Пока нет объявлений</div>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="or-info__announcement">
                  <span className="or-info__announcement-dot" aria-hidden />
                  <p className="or-info__announcement-text">{item.text}</p>
                  <time className="or-info__announcement-time" dateTime={item.created_at}>
                    {formatAnnouncementTime(item.created_at)}
                  </time>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default OperatingRoomInfoPage;
