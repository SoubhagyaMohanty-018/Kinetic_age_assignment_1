const express = require('express');
const router = express.Router();
const { createBooking, myBookings, cancelBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// Every booking route requires login - this is where the "must log in
// during the booking flow to confirm reservation" requirement is enforced.
router.use(protect);

router.post('/', createBooking);
router.get('/me', myBookings);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
