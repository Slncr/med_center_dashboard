import type { OrStatus } from '../utils/operatingRoomStatus';

export type OrAtmosphereSource = 'manual' | 'sensor';

export type OrDisplaySettings = {
  show_stats: boolean;
  show_atmosphere: boolean;
  show_announcements: boolean;
};

export type OrAnnouncement = {
  id: string;
  text: string;
  created_at: string;
};

export type OrAtmosphereConfig = {
  source: OrAtmosphereSource;
  monitor_zone: number | null;
  temp: number | null;
  hum: number | null;
  press: number | null;
};

export type OrAtmosphereView = {
  zone?: number | null;
  temp?: number | null;
  hum?: number | null;
  press?: number | null;
  co2?: number | null;
};

export type OrStatsView = {
  active_patients: number;
  awaiting_examination: number;
  active_prescriptions: number;
  completed_prescriptions: number;
  ready_for_discharge: number;
};

export type OrBoard = {
  status: OrStatus;
  updated_at: string | null;
  display: OrDisplaySettings;
  announcements: OrAnnouncement[];
  atmosphere_config: OrAtmosphereConfig;
  atmosphere: OrAtmosphereView | null;
  atmosphere_error: string | null;
  stats: OrStatsView;
};
