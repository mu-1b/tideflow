import { Preferences, Station, TideData, TideExtreme, TidePoint, Units } from './types';

export const DEFAULT_STATIONS: Station[] = [
  { id: '8531680', name: 'Sandy Hook', state: 'NJ', lat: 40.4669, lon: -74.0094, kind: 'harmonic' },
  { id: '8518750', name: 'The Battery', state: 'NY', lat: 40.7006, lon: -74.0142, kind: 'harmonic' },
  { id: '8534720', name: 'Atlantic City', state: 'NJ', lat: 39.3567, lon: -74.4181, kind: 'harmonic' },
  { id: '8536110', name: 'Cape May', state: 'NJ', lat: 38.9683, lon: -74.96, kind: 'harmonic' },
  { id: '8443970', name: 'Boston', state: 'MA', lat: 42.3539, lon: -71.0503, kind: 'harmonic' },
  { id: '8665530', name: 'Charleston', state: 'SC', lat: 32.7808, lon: -79.9236, kind: 'harmonic' },
  { id: '8723214', name: 'Virginia Key', state: 'FL', lat: 25.7314, lon: -80.1618, kind: 'harmonic' },
  { id: '9414290', name: 'San Francisco', state: 'CA', lat: 37.8063, lon: -122.4659, kind: 'harmonic' },
  { id: '9447130', name: 'Seattle', state: 'WA', lat: 47.6026, lon: -122.3393, kind: 'harmonic' },
  { id: '1612340', name: 'Honolulu', state: 'HI', lat: 21.3033, lon: -157.8645, kind: 'harmonic' },
];

export const DEFAULT_PREFS: Preferences = {
  units: 'english',
  notifications: { enabled: false, highs: true, lows: true, leadMinutes: 30 },
};

const HOUR = 3600 * 1000;
const round = (n: number) => Math.round(n * 1000) / 1000;

// Synthetic semi-diurnal tide, used only when every real data source is unreachable.
export function sampleTides(stationId: string, units: Units): TideData {
  const scale = units === 'metric' ? 0.3048 : 1;
  const period = 12.42 * HOUR;
  const start = Date.now() - 6 * HOUR;
  const end = start + 54 * HOUR;
  const phase = (Number(stationId.slice(-3)) / 1000) * period;
  const level = (t: number) => (2.5 + 2.3 * Math.cos((2 * Math.PI * (t + phase)) / period)) * scale;

  const curve: TidePoint[] = [];
  for (let t = start; t <= end; t += HOUR / 2) {
    curve.push({ time: new Date(t).toISOString(), height: round(level(t)) });
  }

  const extremes: TideExtreme[] = [];
  let t = Math.floor((start + phase) / period) * period - phase;
  for (let high = true; t <= end; t += period / 2, high = !high) {
    if (t >= start) extremes.push({ time: new Date(t).toISOString(), height: round(level(t)), type: high ? 'high' : 'low' });
  }
  return { stationId, units, datum: 'MLLW', extremes, curve, source: 'sample', fetchedAt: Date.now() };
}
