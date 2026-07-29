const Service = require('../models/Service');

exports.listServices = async (req, res) => {
  const services = await Service.find({ isActive: true }).sort({ category: 1, name: 1 });
  res.json({ services });
};

exports.createService = async (req, res) => {
  // admin only (see routes)
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ service });
  } catch (err) {
    res.status(400).json({ message: 'Could not create service', error: err.message });
  }
};
