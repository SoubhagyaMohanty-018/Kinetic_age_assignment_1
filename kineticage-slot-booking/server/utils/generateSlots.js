const Slot = require('../models/Slot');

// Business hours for on-site senior wellness / mobility sessions.
const OPEN_HOUR = 9; // 9 AM
const CLOSE_HOUR = 17; // 5 PM

/**
 * Ensures bookable Slot documents exist for a service for the next `days`
 * days (default 3), one slot every `durationMinutes`. Idempotent: relies on
 * the unique (service, startTime) index, so calling this repeatedly (e.g.
 * on every GET /slots request, or from a cron job) never creates duplicates.
 */
async function ensureSlotsForService(service, days = 3) {
  const now = new Date();
  const slotsToInsert = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(OPEN_HOUR, 0, 0, 0);

    const dayEnd = new Date(day);
    dayEnd.setHours(CLOSE_HOUR, 0, 0, 0);

    let cursor = new Date(day);
    while (cursor.getTime() + service.durationMinutes * 60000 <= dayEnd.getTime()) {
      const startTime = new Date(cursor);
      // Skip slots that have already started today.
      if (startTime > now) {
        const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);
        slotsToInsert.push({
          service: service._id,
          startTime,
          endTime,
          capacity: service.capacityPerSlot,
          bookedCount: 0,
        });
      }
      cursor = new Date(cursor.getTime() + service.durationMinutes * 60000);
    }
  }

  if (slotsToInsert.length === 0) return;

  // ordered: false + unique index -> duplicate-key errors for slots that
  // already exist are silently skipped, new ones are still inserted.
  try {
    await Slot.insertMany(slotsToInsert, { ordered: false });
  } catch (err) {
    // BulkWriteError from duplicate keys is expected and safe to ignore.
    if (err.code !== 11000 && !err.writeErrors) throw err;
  }
}

module.exports = { ensureSlotsForService };
