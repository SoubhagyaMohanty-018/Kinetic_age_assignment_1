const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['senior-wellness', 'mobility-program'],
      required: true,
    },
    durationMinutes: { type: Number, required: true, default: 60 },
    price: { type: Number, required: true, default: 0 }, // 0 = free session
    capacityPerSlot: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
