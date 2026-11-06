import { Router } from 'express';
import { cached } from '../cache.js';
import { fetchStations, fetchTides } from '../noaa.js';
import { fetchWeather } from '../weather.js';

const router = Router();
const HOUR = 3600 * 1000;

const loadStations = () => cached('stations', 24 * HOUR, fetchStations);

function distanceKm(aLat, aLon, bLat, bLon) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

router.get('/stations', async (req, res) => {
  const { data, source, fetchedAt } = await loadStations();
  const q = String(req.query.q || '').trim().toLowerCase();
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  let stations = data;
  if (q) {
    stations = stations.filter(
      (s) => s.name.toLowerCase().includes(q) || s.state.toLowerCase() === q || s.id.startsWith(q),
    );
  }
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    stations = stations
      .map((s) => ({ ...s, distanceKm: Math.round(distanceKm(lat, lon, s.lat, s.lon) * 10) / 10 }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
  res.json({ stations: stations.slice(0, limit), total: stations.length, source, fetchedAt });
});

router.get('/stations/:id', async (req, res) => {
  const { data } = await loadStations();
  const station = data.find((s) => s.id === req.params.id);
  if (!station) return res.status(404).json({ error: 'Station not found' });
  res.json({ station });
});

router.get('/stations/:id/tides', async (req, res) => {
  const units = req.query.units === 'metric' ? 'metric' : 'english';
  if (!/^\d{7}$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid station id' });
  const result = await cached(`tides:${req.params.id}:${units}`, HOUR, () => fetchTides(req.params.id, units));
  res.json({ ...result.data, source: result.source, fetchedAt: result.fetchedAt, warning: result.warning });
});

router.get('/weather', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'lat and lon required' });
  const units = req.query.units === 'metric' ? 'metric' : 'english';
  const key = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}:${units}`;
  const result = await cached(key, 20 * 60 * 1000, () => fetchWeather(lat, lon, units));
  res.json({ ...result.data, source: result.source, fetchedAt: result.fetchedAt });
});

export default router;
