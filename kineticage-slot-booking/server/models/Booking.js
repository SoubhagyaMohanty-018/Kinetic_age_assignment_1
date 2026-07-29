const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    paymentMethod: { type: String, enum: ['prepaid', 'cod'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'not_required'],
      default: 'pending',
    },
    amount: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// A user cannot double-book the same slot - enforced at the DB level,
// not just in application logic.
BookingSchema.index({ user: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('Booking', BookingSchema);
