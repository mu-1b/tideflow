import { DataSource, Station, TideData, TideExtreme, TidePoint } from './types';

const ms = (iso: string) => new Date(iso).getTime();

// Cosine interpolation between highs and lows approximates the curve for stations without a full prediction series.
export function curveFromExtremes(extremes: TideExtreme[], stepMin = 30): TidePoint[] {
  const points: TidePoint[] = [];
  for (let i = 0; i < extremes.length - 1; i++) {
    const a = extremes[i];
    const b = extremes[i + 1];
    const t0 = ms(a.time);
    const t1 = ms(b.time);
    for (let t = t0; t < t1; t += stepMin * 60 * 1000) {
      const f = (1 - Math.cos((Math.PI * (t - t0)) / (t1 - t0))) / 2;
      points.push({ time: new Date(t).toISOString(), height: a.height + (b.height - a.height) * f });
    }
  }
  const last = extremes[extremes.length - 1];
  if (last) points.push({ time: last.time, height: last.height });
  return points;
}

export function levelAt(curve: TidePoint[], time = Date.now()): number | null {
  for (let i = 0; i < curve.length - 1; i++) {
    const t0 = ms(curve[i].time);
    const t1 = ms(curve[i + 1].time);
    if (time >= t0 && time <= t1) {
      return curve[i].height + ((curve[i + 1].height - curve[i].height) * (time - t0)) / (t1 - t0);
    }
  }
  return null;
}

export const upcoming = (data: TideData, now = Date.now()) => data.extremes.filter((e) => ms(e.time) > now);

export function trend(data: TideData, now = Date.now()) {
  const next = upcoming(data, now)[0];
  if (!next) return null;
  return next.type === 'high' ? 'Rising' : 'Falling';
}

export const unitLabel = (units: string) => (units === 'metric' ? 'm' : 'ft');

export const formatHeight = (h: number, units: string) => `${h.toFixed(1)} ${unitLabel(units)}`;

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function formatDay(iso: string) {
  const d = new Date(iso).toDateString();
  if (d === new Date().toDateString()) return 'Today';
  if (d === new Date(Date.now() + 86400000).toDateString()) return 'Tomorrow';
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatCountdown(iso: string, now = Date.now()) {
  const mins = Math.max(0, Math.round((ms(iso) - now) / 60000));
  const h = Math.floor(mins / 60);
  return h ? `in ${h}h ${mins % 60}m` : `in ${mins}m`;
}

export function sourceLabel(source: DataSource, fetchedAt: number) {
  const when = new Date(fetchedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  switch (source) {
    case 'live':
      return { text: 'Live NOAA predictions', tone: 'ok' as const };
    case 'cache':
      return { text: `NOAA predictions · cached ${when}`, tone: 'ok' as const };
    case 'noaa-direct':
      return { text: 'Live NOAA predictions · server offline', tone: 'ok' as const };
    case 'stale':
      return { text: `Cached ${when} · NOAA unreachable`, tone: 'warn' as const };
    case 'device-cache':
      return { text: `Offline · saved on device ${when}`, tone: 'warn' as const };
    case 'sample':
      return { text: 'Sample data · not real predictions', tone: 'error' as const };
  }
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function filterStations(list: Station[], q?: string, near?: { lat: number; lon: number }, limit = 50) {
  const query = (q || '').trim().toLowerCase();
  let out = query
    ? list.filter((s) => s.name.toLowerCase().includes(query) || s.state.toLowerCase() === query || s.id.startsWith(query))
    : list;
  if (near) {
    out = out
      .map((s) => ({ ...s, distanceKm: Math.round(distanceKm(near, s) * 10) / 10 }))
      .sort((a, b) => a.distanceKm! - b.distanceKm!);
  }
  return out.slice(0, limit);
}
