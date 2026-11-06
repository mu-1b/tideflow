import mongoose from 'mongoose';

const savedStationSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    stationId: { type: String, required: true },
    name: { type: String, required: true },
    state: String,
    lat: Number,
    lon: Number,
  },
  { timestamps: true },
);

savedStationSchema.index({ deviceId: 1, stationId: 1 }, { unique: true });

export default mongoose.model('SavedStation', savedStationSchema);
