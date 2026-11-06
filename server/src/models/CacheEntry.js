import mongoose from 'mongoose';

const cacheEntrySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  data: mongoose.Schema.Types.Mixed,
  fetchedAt: { type: Date, required: true },
});

export default mongoose.model('CacheEntry', cacheEntrySchema);
