const DATA_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const META_URL = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json';
const APP = 'TideFlow';

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`NOAA responded ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || 'NOAA error');
  return body;
}

export async function fetchStations() {
  const body = await getJson(`${META_URL}?type=tidepredictions`);
  return body.stations.map((s) => ({
    id: s.id,
    name: s.name,
    state: s.state || '',
    lat: s.lat,
    lon: s.lng,
    kind: s.type === 'S' ? 'subordinate' : 'harmonic',
  }));
}

const pad = (n) => String(n).padStart(2, '0');
const noaaDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const toIso = (t) => `${t.replace(' ', 'T')}:00Z`;

async function predictions(stationId, interval, begin, hours, units) {
  const params = new URLSearchParams({
    product: 'predictions',
    application: APP,
    station: stationId,
    begin_date: noaaDate(begin),
    range: String(hours),
    datum: 'MLLW',
    time_zone: 'gmt',
    units,
    interval,
    format: 'json',
  });
  const body = await getJson(`${DATA_URL}?${params}`);
  return body.predictions.map((p) => ({
    time: toIso(p.t),
    height: Number(p.v),
    ...(p.type ? { type: p.type === 'H' ? 'high' : 'low' } : {}),
  }));
}

export async function fetchTides(stationId, units = 'english') {
  const begin = new Date(Date.now() - 6 * 3600 * 1000);
  begin.setUTCMinutes(0, 0, 0);
  // Subordinate stations only support hi/lo, so the curve is optional.
  const [extremes, curve] = await Promise.all([
    predictions(stationId, 'hilo', begin, 54, units),
    predictions(stationId, '30', begin, 54, units).catch(() => []),
  ]);
  return { stationId, units, datum: 'MLLW', extremes, curve };
}
