const express = require('express');
const router = express.Router();
const { listServices, createService } = require('../controllers/serviceController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', listServices);
router.post('/', protect, adminOnly, createService);

module.exports = router;
