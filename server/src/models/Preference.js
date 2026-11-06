import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    units: { type: String, enum: ['english', 'metric'], default: 'english' },
    defaultStationId: { type: String, default: '8531680' },
    notifications: {
      enabled: { type: Boolean, default: false },
      highs: { type: Boolean, default: true },
      lows: { type: Boolean, default: true },
      leadMinutes: { type: Number, default: 30, min: 0, max: 240 },
    },
  },
  { timestamps: true },
);

export default mongoose.model('Preference', preferenceSchema);
