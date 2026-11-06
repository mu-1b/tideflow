import mongoose from 'mongoose';

export async function connectDb(uri) {
  if (!uri) {
    console.warn('MONGODB_URI not set — running without persistence');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.warn(`MongoDB unavailable (${err.message}) — running without persistence`);
  }
}

export const dbReady = () => mongoose.connection.readyState === 1;

export function requireDb(req, res, next) {
  if (!dbReady()) return res.status(503).json({ error: 'Database unavailable' });
  next();
}

export function requireDevice(req, res, next) {
  const id = req.get('x-device-id');
  if (!id || id.length > 64) return res.status(400).json({ error: 'Missing x-device-id header' });
  req.deviceId = id;
  next();
}
