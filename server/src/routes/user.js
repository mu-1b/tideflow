import { Router } from 'express';
import SavedStation from '../models/SavedStation.js';
import Preference from '../models/Preference.js';
import { requireDb, requireDevice } from '../db.js';

const router = Router();
router.use(requireDb, requireDevice);

router.get('/saved', async (req, res) => {
  const stations = await SavedStation.find({ deviceId: req.deviceId }).sort({ createdAt: 1 }).lean();
  res.json({ stations });
});

router.post('/saved', async (req, res) => {
  const { stationId, name, state, lat, lon } = req.body || {};
  if (!stationId || !name) return res.status(400).json({ error: 'stationId and name required' });
  const station = await SavedStation.findOneAndUpdate(
    { deviceId: req.deviceId, stationId },
    { name, state, lat, lon },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ station });
});

router.delete('/saved/:stationId', async (req, res) => {
  await SavedStation.deleteOne({ deviceId: req.deviceId, stationId: req.params.stationId });
  res.status(204).end();
});

router.get('/preferences', async (req, res) => {
  const prefs = await Preference.findOneAndUpdate(
    { deviceId: req.deviceId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ preferences: prefs });
});

router.put('/preferences', async (req, res) => {
  const { units, defaultStationId, notifications } = req.body || {};
  const update = {};
  if (units) update.units = units;
  if (defaultStationId) update.defaultStationId = defaultStationId;
  if (notifications) {
    for (const [k, v] of Object.entries(notifications)) update[`notifications.${k}`] = v;
  }
  const prefs = await Preference.findOneAndUpdate({ deviceId: req.deviceId }, update, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  res.json({ preferences: prefs });
});

export default router;
