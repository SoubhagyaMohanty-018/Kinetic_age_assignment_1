const mongoose = require('mongoose');

// A Slot represents one bookable time window for one service.
// capacity/bookedCount live on the SAME document so that reserving a seat
// is a single atomic update (see bookingController.js) instead of a
// separate "count existing bookings" query racing against another request.
const SlotSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number, required: true, default: 1 },
    bookedCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// One slot document per (service, startTime) - prevents duplicate slot generation
// and gives us a natural point of atomic contention for concurrent bookings.
SlotSchema.index({ service: 1, startTime: 1 }, { unique: true });

SlotSchema.virtual('isFull').get(function () {
  return this.bookedCount >= this.capacity;
});

SlotSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Slot', SlotSchema);
