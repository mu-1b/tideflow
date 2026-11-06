import CacheEntry from './models/CacheEntry.js';
import { dbReady } from './db.js';

const memory = new Map();

async function read(key) {
  if (memory.has(key)) return memory.get(key);
  if (!dbReady()) return null;
  const doc = await CacheEntry.findOne({ key }).lean();
  if (!doc) return null;
  const entry = { data: doc.data, fetchedAt: doc.fetchedAt.getTime() };
  memory.set(key, entry);
  return entry;
}

async function write(key, data) {
  const entry = { data, fetchedAt: Date.now() };
  memory.set(key, entry);
  if (dbReady()) {
    await CacheEntry.updateOne(
      { key },
      { data, fetchedAt: new Date(entry.fetchedAt) },
      { upsert: true },
    ).catch(() => {});
  }
  return entry;
}

// Returns fresh data when possible, falls back to a stale copy if the upstream fails.
export async function cached(key, ttlMs, fetcher) {
  const existing = await read(key);
  if (existing && Date.now() - existing.fetchedAt < ttlMs) {
    return { ...existing, source: 'cache' };
  }
  try {
    const entry = await write(key, await fetcher());
    return { ...entry, source: 'live' };
  } catch (err) {
    if (existing) return { ...existing, source: 'stale', warning: err.message };
    throw err;
  }
}
