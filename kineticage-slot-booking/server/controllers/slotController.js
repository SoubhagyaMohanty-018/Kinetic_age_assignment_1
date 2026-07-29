const Service = require('../models/Service');
const Slot = require('../models/Slot');
const { ensureSlotsForService } = require('../utils/generateSlots');

// GET /api/slots?serviceId=...
// Returns available slots for the next 3 days for the given service.
exports.getSlots = async (req, res) => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) return res.status(400).json({ message: 'serviceId is required' });

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    // Lazily generate slots so admins never have to run a separate job,
    // and the "next 3 days" window always stays current.
    await ensureSlotsForService(service, 3);

    const now = new Date();
    const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const slots = await Slot.find({
      service: serviceId,
      startTime: { $gte: now, $lte: horizon },
    }).sort({ startTime: 1 });

    res.json({ service, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch slots', error: err.message });
  }
};
