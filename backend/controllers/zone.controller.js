const Zone = require('../models/Zone');

exports.createZone = async (req, res) => {
  try {
    const zone = await Zone.create(req.body);
    res.status(201).json(zone);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.find();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
