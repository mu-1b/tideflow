export type Station = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  kind?: 'harmonic' | 'subordinate';
  distanceKm?: number;
};

export type Units = 'english' | 'metric';

export type TidePoint = { time: string; height: number };
export type TideExtreme = TidePoint & { type: 'high' | 'low' };

export type DataSource = 'live' | 'cache' | 'stale' | 'noaa-direct' | 'device-cache' | 'sample';

export type TideData = {
  stationId: string;
  units: Units;
  datum: string;
  extremes: TideExtreme[];
  curve: TidePoint[];
  curveInterpolated?: boolean;
  source: DataSource;
  fetchedAt: number;
};

export type Weather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  code: number;
  units: { temperature: string; wind: string };
};

export type NotificationPrefs = {
  enabled: boolean;
  highs: boolean;
  lows: boolean;
  leadMinutes: number;
};

export type Preferences = {
  units: Units;
  notifications: NotificationPrefs;
};
