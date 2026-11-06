import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import { DEFAULT_STATIONS, sampleTides } from './defaults';
import { curveFromExtremes, filterStations } from './tide';
import { Preferences, Station, TideData, TideExtreme, TidePoint, Units, Weather } from './types';

let deviceId = '';
export const setDeviceId = (id: string) => (deviceId = id);

async function request<T>(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (res.status === 204) return undefined as T;
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(body.error?.message || body.error || `HTTP ${res.status}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

const backend = <T>(path: string, init: RequestInit = {}) =>
  request<T>(`${API_URL}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId, ...init.headers },
  }, 6000);

// Direct NOAA access, used when the TideFlow server is unreachable.
const NOAA_DATA = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NOAA_META = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions';
let stationCache: Station[] | null = null;

async function noaaStations(): Promise<Station[]> {
  if (stationCache) return stationCache;
  const body = await request<{ stations: any[] }>(NOAA_META, {}, 12000);
  stationCache = body.stations.map((s) => ({
    id: s.id,
    name: s.name,
    state: s.state || '',
    lat: s.lat,
    lon: s.lng,
    kind: s.type === 'S' ? 'subordinate' : 'harmonic',
  }));
  return stationCache;
}

const pad = (n: number) => String(n).padStart(2, '0');
const noaaDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:00`;

async function noaaPredictions(id: string, interval: string, units: Units) {
  const params = new URLSearchParams({
    product: 'predictions',
    application: 'TideFlow',
    station: id,
    begin_date: noaaDate(new Date(Date.now() - 6 * 3600 * 1000)),
    range: '54',
    datum: 'MLLW',
    time_zone: 'gmt',
    units,
    interval,
    format: 'json',
  });
  const body = await request<{ predictions: { t: string; v: string; type?: string }[] }>(`${NOAA_DATA}?${params}`);
  return body.predictions.map((p) => ({
    time: `${p.t.replace(' ', 'T')}:00Z`,
    height: Number(p.v),
    ...(p.type ? { type: p.type === 'H' ? 'high' : 'low' } : {}),
  }));
}

async function noaaTides(id: string, units: Units): Promise<TideData> {
  const [extremes, curve] = await Promise.all([
    noaaPredictions(id, 'hilo', units) as Promise<TideExtreme[]>,
    noaaPredictions(id, '30', units).catch(() => [] as TidePoint[]),
  ]);
  return { stationId: id, units, datum: 'MLLW', extremes, curve, source: 'noaa-direct', fetchedAt: Date.now() };
}

export async function getStations(opts: { q?: string; near?: { lat: number; lon: number }; limit?: number } = {}) {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 50) });
  if (opts.q) params.set('q', opts.q);
  if (opts.near) {
    params.set('lat', String(opts.near.lat));
    params.set('lon', String(opts.near.lon));
  }
  try {
    const { stations } = await backend<{ stations: Station[] }>(`/stations?${params}`);
    return { stations, offline: false };
  } catch {
    try {
      return { stations: filterStations(await noaaStations(), opts.q, opts.near, opts.limit), offline: false };
    } catch {
      return { stations: filterStations(DEFAULT_STATIONS, opts.q, opts.near, opts.limit), offline: true };
    }
  }
}

export async function getTides(station: Station, units: Units): Promise<TideData> {
  const key = `tides:${station.id}:${units}`;
  let data: TideData | null = null;
  try {
    data = await backend<TideData>(`/stations/${station.id}/tides?units=${units}`);
  } catch {
    try {
      data = await noaaTides(station.id, units);
    } catch {
      const saved = await AsyncStorage.getItem(key);
      data = saved ? { ...JSON.parse(saved), source: 'device-cache' } : sampleTides(station.id, units);
    }
  }
  if (data!.source !== 'device-cache' && data!.source !== 'sample') {
    AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
  }
  if (!data!.curve.length) data = { ...data!, curve: curveFromExtremes(data!.extremes), curveInterpolated: true };
  return data!;
}

export async function getWeather(lat: number, lon: number, units: Units): Promise<Weather | null> {
  try {
    return await backend<Weather>(`/weather?lat=${lat}&lon=${lon}&units=${units}`);
  } catch {
    try {
      const imperial = units === 'english';
      const params = new URLSearchParams({
        latitude: lat.toFixed(3),
        longitude: lon.toFixed(3),
        current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
        temperature_unit: imperial ? 'fahrenheit' : 'celsius',
        wind_speed_unit: imperial ? 'mph' : 'kmh',
      });
      const { current, current_units } = await request<any>(`https://api.open-meteo.com/v1/forecast?${params}`);
      return {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        code: current.weather_code,
        units: { temperature: current_units.temperature_2m, wind: current_units.wind_speed_10m },
      };
    } catch {
      return null;
    }
  }
}

type SavedDoc = { stationId: string; name: string; state?: string; lat: number; lon: number };
const fromDoc = (d: SavedDoc): Station => ({ id: d.stationId, name: d.name, state: d.state || '', lat: d.lat, lon: d.lon });

export const server = {
  async saved() {
    const { stations } = await backend<{ stations: SavedDoc[] }>('/saved');
    return stations.map(fromDoc);
  },
  save: (s: Station) =>
    backend('/saved', {
      method: 'POST',
      body: JSON.stringify({ stationId: s.id, name: s.name, state: s.state, lat: s.lat, lon: s.lon }),
    }),
  unsave: (id: string) => backend(`/saved/${id}`, { method: 'DELETE' }),
  async preferences() {
    const { preferences } = await backend<{ preferences: Preferences & { defaultStationId: string } }>('/preferences');
    return preferences;
  },
  updatePreferences: (prefs: Partial<Preferences> & { defaultStationId?: string }) =>
    backend('/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),
};
