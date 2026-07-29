# Database Schema & Architectural Decisions

## Collections

### User
| Field         | Type   | Notes                                  |
|---------------|--------|------------------------------------------|
| name          | String | required                                 |
| email         | String | required, unique, lowercase              |
| phone         | String | required                                 |
| passwordHash  | String | bcrypt hash, never store plaintext        |
| role          | Enum   | `user` \| `admin`, default `user`         |

### Service
| Field           | Type   | Notes                                              |
|-----------------|--------|------------------------------------------------------|
| name            | String | e.g. "Chair Yoga & Flexibility"                       |
| description     | String |                                                     |
| category        | Enum   | `senior-wellness` \| `mobility-program`               |
| durationMinutes | Number | used to auto-generate slot boundaries                  |
| price           | Number | 0 = free session                                     |
| capacityPerSlot | Number | how many people can book the same time slot            |
| isActive        | Boolean| soft-disable a service without deleting it              |

### Slot
| Field       | Type      | Notes                                                     |
|-------------|-----------|--------------------------------------------------------------|
| service     | ObjectId  | ref Service                                                  |
| startTime   | Date      |                                                             |
| endTime     | Date      |                                                             |
| capacity    | Number    | copied from `service.capacityPerSlot` at generation time      |
| bookedCount | Number    | incremented/decremented atomically on booking/cancellation      |

Unique compound index: `{ service: 1, startTime: 1 }` — guarantees only one
slot document exists per service per time window, so slot generation can be
called repeatedly (idempotent) without ever creating duplicates.

### Booking
| Field         | Type     | Notes                                                    |
|---------------|----------|-------------------------------------------------------------|
| user          | ObjectId | ref User                                                    |
| service       | ObjectId | ref Service (denormalized onto the booking for fast reads)   |
| slot          | ObjectId | ref Slot                                                    |
| status        | Enum     | `confirmed` \| `cancelled` \| `completed`                     |
| paymentMethod | Enum     | `prepaid` \| `cod`                                          |
| paymentStatus | Enum     | `pending` \| `paid` \| `refunded` \| `not_required`            |
| amount        | Number   | snapshot of service price at booking time                     |
| notes         | String   | optional                                                    |

Unique compound index: `{ user: 1, slot: 1 }` — a user cannot hold two
bookings for the same slot (protects against double-tap submissions).

**Why store `bookedCount` on `Slot` instead of just `COUNT`-ing Bookings?**
Counting bookings on every request (`Booking.countDocuments({ slot })`) creates
a read-then-write race: two requests could both read "2 of 3 seats taken",
both decide there's room, and both insert a booking — overbooking the slot.
Keeping a running `bookedCount` on the `Slot` document lets us reserve a seat
with a single atomic conditional update instead of a separate read + write.

## The Core ACID Guarantee: Booking Creation

`POST /api/bookings` (see `server/controllers/bookingController.js`) is the
one operation in this app where correctness really matters, so it's worth
walking through in detail.

```js
const slot = await Slot.findOneAndUpdate(
  { _id: slotId, $expr: { $lt: ['$bookedCount', '$capacity'] } },
  { $inc: { bookedCount: 1 } },
  { new: true, session }
);
```

- **Atomicity & Isolation:** `findOneAndUpdate` is a single atomic operation
  in MongoDB — the filter (`bookedCount < capacity`) and the update
  (`bookedCount += 1`) are evaluated as one indivisible step at the storage
  engine level. If two requests race for the last seat, MongoDB serializes
  them: the first one's update makes `bookedCount == capacity`, so the second
  one's filter no longer matches and it returns `null` — cleanly rejected as
  "slot full" instead of overbooking.
- **Consistency:** the update only happens together with creating the
  `Booking` document, inside a `mongoose.startSession()` / `withTransaction()`
  block. If creating the `Booking` fails for any reason after the seat was
  reserved (e.g. a validation error), the whole transaction aborts and MongoDB
  rolls the `bookedCount` increment back too — we never end up with a "phantom"
  reserved seat that has no corresponding booking record.
- **Durability:** once `withTransaction` resolves successfully, the write has
  been committed and acknowledged by MongoDB's write concern, so it survives
  a server crash or restart.
- **Defense in depth:** the unique index on `Booking{user, slot}` independently
  prevents the same user from ending up with two booking records for the same
  slot (e.g. a double-submitted form), even outside the transaction logic.

Cancellation (`PATCH /api/bookings/:id/cancel`) uses the same transactional
pattern in reverse: marking the booking `cancelled` and decrementing
`Slot.bookedCount` happen together, so a cancelled booking always correctly
frees up its seat.

**Trade-off:** multi-document transactions require MongoDB to run as a
replica set (a single standalone `mongod` does not support them). This is
noted in the README setup instructions — MongoDB Atlas's free tier satisfies
this out of the box, which is why it's the recommended option for running
this project.

## Other Architectural Decisions

- **Modular backend:** routes → controllers → models, with no business logic
  in route files, following a standard layered Express structure so it's easy
  to extend (e.g. adding an admin panel or notifications later).
- **Lazy, idempotent slot generation:** rather than a scheduled job that could
  drift out of sync, `GET /api/slots` calls `ensureSlotsForService()` on every
  request, which relies on the unique `(service, startTime)` index to safely
  no-op for slots that already exist. This keeps the "next 3 days" window
  always accurate with zero extra infrastructure.
- **JWT auth, enforced only where required:** browsing services and slots is
  public (so users can see availability before deciding to sign up), but every
  route under `/api/bookings` is behind `protect` middleware — matching the
  requirement that login is only required to *confirm* a reservation, not to
  browse.
- **Price snapshotting:** `Booking.amount` copies `Service.price` at booking
  time rather than referencing it live, so historical bookings stay accurate
  even if a service's price changes later.
