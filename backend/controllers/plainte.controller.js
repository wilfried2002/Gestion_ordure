const Plainte = require('../models/Plainte');

exports.createPlainte = async (req, res) => {
  try {
    const plainte = await Plainte.create(req.body);
    res.status(201).json(plainte);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlaintes = async (req, res) => {
  try {
    const plaintes = await Plainte.find().populate('citoyenId');
    res.json(plaintes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
