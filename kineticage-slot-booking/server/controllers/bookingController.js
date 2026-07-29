const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

/**
 * POST /api/bookings
 * body: { slotId, paymentMethod: 'prepaid' | 'cod' }
 *
 * ACID reasoning:
 * - Atomicity/Consistency: reserving a seat (incrementing Slot.bookedCount)
 *   and creating the Booking document happen inside a single MongoDB
 *   transaction (session). If either step fails, everything rolls back -
 *   we never end up with a seat "held" but no Booking record, or a Booking
 *   record for a slot that was never actually reserved.
 * - Isolation: the seat reservation itself is done with an atomic
 *   findOneAndUpdate filtered on `bookedCount: { $lt: capacity }`. Two
 *   concurrent requests for the last remaining seat cannot both succeed -
 *   MongoDB serializes the update at the document level, so the second
 *   request's filter simply no longer matches and it fails cleanly with
 *   "Slot is fully booked" instead of overbooking.
 * - Durability: once the transaction commits, MongoDB's write concern
 *   guarantees the booking survives a crash/restart.
 * - The unique index on Booking{user, slot} is a second safety net against
 *   accidental duplicate submissions (e.g. a user double-tapping "Confirm").
 */
exports.createBooking = async (req, res) => {
  const { slotId, paymentMethod, notes } = req.body;
  const userId = req.user.id;

  if (!slotId || !['prepaid', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'slotId and a valid paymentMethod are required' });
  }

  const session = await mongoose.startSession();
  try {
    let createdBooking;

    await session.withTransaction(async () => {
      // Atomically claim a seat: only succeeds if the slot still has room.
      const slot = await Slot.findOneAndUpdate(
        { _id: slotId, $expr: { $lt: ['$bookedCount', '$capacity'] } },
        { $inc: { bookedCount: 1 } },
        { new: true, session }
      );

      if (!slot) {
        // Either the slot doesn't exist, or it's already full.
        const exists = await Slot.findById(slotId).session(session);
        throw exists
          ? new BookingError('This slot is fully booked. Please choose another.', 409)
          : new BookingError('Slot not found.', 404);
      }

      if (slot.startTime <= new Date()) {
        throw new BookingError('This slot is in the past and can no longer be booked.', 400);
      }

      const service = await Service.findById(slot.service).session(session);
      if (!service) throw new BookingError('Service not found.', 404);

      const amount = paymentMethod === 'prepaid' ? service.price : service.price;
      const paymentStatus =
        paymentMethod === 'cod' ? 'pending' : service.price === 0 ? 'not_required' : 'pending';

      const docs = await Booking.create(
        [
          {
            user: userId,
            service: service._id,
            slot: slot._id,
            paymentMethod,
            paymentStatus,
            amount,
            notes,
          },
        ],
        { session }
      );
      createdBooking = docs[0];
    });

    const populated = await createdBooking.populate(['service', 'slot']);
    res.status(201).json({ booking: populated });
  } catch (err) {
    if (err instanceof BookingError) {
      return res.status(err.status).json({ message: err.message });
    }
    // Duplicate booking (same user + slot) caught by the unique index.
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already booked this slot.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Booking failed', error: err.message });
  } finally {
    session.endSession();
  }
};

class BookingError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// GET /api/bookings/me
exports.myBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate('service')
    .populate('slot')
    .sort({ createdAt: -1 });

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.slot && b.slot.startTime > now && b.status === 'confirmed'
  );
  const past = bookings.filter(
    (b) => !b.slot || b.slot.startTime <= now || b.status !== 'confirmed'
  );

  res.json({ upcoming, past });
};

// PATCH /api/bookings/:id/cancel
// Also runs in a transaction: releasing the seat and marking the booking
// cancelled must happen together or not at all.
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).session(session);

      if (!booking) throw new BookingError('Booking not found.', 404);
      if (booking.status === 'cancelled') throw new BookingError('Booking already cancelled.', 400);

      booking.status = 'cancelled';
      if (booking.paymentStatus === 'paid') booking.paymentStatus = 'refunded';
      await booking.save({ session });

      await Slot.updateOne(
        { _id: booking.slot },
        { $inc: { bookedCount: -1 } },
        { session }
      );

      result = booking;
    });

    res.json({ booking: result });
  } catch (err) {
    if (err instanceof BookingError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Cancellation failed', error: err.message });
  } finally {
    session.endSession();
  }
};
