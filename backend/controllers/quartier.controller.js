const Quartier = require('../models/Quartier');

exports.createQuartier = async (req, res) => {
  try {
    const quartier = await Quartier.create(req.body);
    res.status(201).json(quartier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQuartiers = async (req, res) => {
  try {
    const quartiers = await Quartier.find().populate('zoneId');
    res.json(quartiers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
