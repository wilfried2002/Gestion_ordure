const Tournee = require('../models/Tournee');

exports.createTournee = async (req, res) => {
  try {
    const tournee = await Tournee.create(req.body);
    res.status(201).json(tournee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTournees = async (req, res) => {
  try {
    const tournees = await Tournee.find()
      .populate('equipeId')
      .populate('quartiers');
    res.json(tournees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
