const express = require('express');
const router = express.Router();
const { getSlots } = require('../controllers/slotController');

// Browsing slots does not require login - only confirming a booking does.
router.get('/', getSlots);

module.exports = router;
