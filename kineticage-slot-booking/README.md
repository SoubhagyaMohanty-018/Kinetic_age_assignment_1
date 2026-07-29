# KineticAge Slot Booking Application

A full-stack MERN application for booking KineticAge senior wellness and mobility
sessions. Built for the KineticAge Software Engineer Intern assessment (Option 1).

## Features

- Browse services (Senior Wellness & Mobility Programs)
- View available slots for the **next 3 days** per service
- Log in only when confirming a reservation (browsing is open to everyone)
- Prepaid or Cash on Delivery (COD) payment options
- Personal dashboard to view upcoming / past bookings and cancel upcoming ones
- ACID-safe booking: no double-booking or overbooking, even under concurrent
  requests (see `SCHEMA_AND_ARCHITECTURE.md` for details)

## Tech Stack

- **Frontend:** React (Create React App), React Router, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose (uses multi-document transactions)
- **Auth:** JWT + bcrypt password hashing

## Project Structure

```
kineticage-slot-booking/
├── server/            # Express API
│   ├── config/        # DB connection
│   ├── controllers/    # Route handlers / business logic
│   ├── middleware/     # JWT auth middleware
│   ├── models/          # Mongoose schemas (User, Service, Slot, Booking)
│   ├── routes/         # Express routers
│   ├── utils/           # Slot-generation helper
│   ├── seed.js         # Seeds sample services + an admin user
│   └── server.js       # App entry point
├── client/             # React app
│   └── src/
│       ├── api/         # Axios instance
│       ├── context/     # AuthContext (JWT session)
│       ├── components/ # Navbar, SlotCard, PrivateRoute
│       └── pages/       # Home, Services, Booking, Login, Register, Dashboard
├── README.md
└── SCHEMA_AND_ARCHITECTURE.md
```

## Prerequisites

- Node.js 18+
- MongoDB running as a **replica set** (required for the transactions used in
  booking/cancellation). The easiest options:
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (Atlas
    clusters are replica sets by default) — recommended.
  - A local single-node replica set: `mongod --replSet rs0`, then run
    `mongosh --eval "rs.initiate()"` once.

## Setup & Run Locally

### 1. Clone and install

```bash
git clone <your-repo-url>
cd kineticage-slot-booking

cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

```bash
# server/.env
cp server/.env.example server/.env
# then edit server/.env and set MONGO_URI and JWT_SECRET

# client/.env
cp client/.env.example client/.env
```

### 3. Seed sample data (services + an admin account)

```bash
cd server
npm run seed
```

This creates 4 sample services (2 senior wellness, 2 mobility program) and an
admin user (`admin@kineticage.com` / `Admin@123`).

### 4. Run the backend

```bash
cd server
npm run dev      # nodemon, auto-restarts on changes
# or: npm start
```

API runs on `http://localhost:5000` by default. Health check:
`GET http://localhost:5000/api/health`.

### 5. Run the frontend

```bash
cd client
npm start
```

App runs on `http://localhost:3000`.

## Testing the Booking Flow

1. Go to `http://localhost:3000` → **Browse Services**.
2. Pick a service → you'll see slots for the next 3 days.
3. Select a slot → choose Prepaid or COD → **Confirm Booking**.
4. If you're not logged in, you'll be redirected to **Login/Register** first,
   exactly as required ("users must log in during the booking flow to confirm
   the reservation").
5. After logging in, go back and confirm — the booking appears instantly in
   **My Bookings** (Dashboard), where you can also cancel upcoming bookings.

### Testing concurrency / double-booking protection

Set a service's `capacityPerSlot` to `1` (or use the seeded "Mobility
Assessment" service, capacity 1), then fire two booking requests for the same
slot at the same time, e.g. with two browser tabs logged in as different
users, or with a quick script:

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <token1>" -H "Content-Type: application/json" \
  -d '{"slotId":"<slotId>","paymentMethod":"cod"}' &
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <token2>" -H "Content-Type: application/json" \
  -d '{"slotId":"<slotId>","paymentMethod":"cod"}' &
```

Exactly one request will succeed with `201`; the other will get `409 Slot is
fully booked`. See `SCHEMA_AND_ARCHITECTURE.md` for why this is guaranteed.

## API Overview

| Method | Endpoint                  | Auth | Description                          |
|--------|----------------------------|------|--------------------------------------|
| POST   | /api/auth/register         | No   | Create account                       |
| POST   | /api/auth/login            | No   | Log in, returns JWT                  |
| GET    | /api/auth/me               | Yes  | Current user profile                 |
| GET    | /api/services              | No   | List active services                 |
| GET    | /api/slots?serviceId=      | No   | Next-3-day slots for a service       |
| POST   | /api/bookings               | Yes  | Create a booking (ACID-safe)         |
| GET    | /api/bookings/me            | Yes  | Current user's upcoming/past bookings|
| PATCH  | /api/bookings/:id/cancel    | Yes  | Cancel an upcoming booking            |

## Notes on AI-Assisted Development

This project was scaffolded with AI assistance. All code was reviewed and is
understood — the key design decision (atomic slot reservation + transactional
booking creation, detailed in `SCHEMA_AND_ARCHITECTURE.md`) is the part most
worth understanding deeply, since it's what actually satisfies the "prevent
double-booking" requirement.

## Known Simplifications (given assessment scope)

- "Prepaid" payment is modeled with a `paymentStatus` field but does not
  integrate a real payment gateway (e.g. Razorpay/Stripe) — this would be the
  next step for production.
- No admin UI is included; `POST /api/services` exists and is admin-protected
  for seeding/managing services, but there's no dedicated screen for it.
- Slot generation runs lazily per-service on request (idempotent, safe to
  call repeatedly) rather than via a scheduled cron job.
