const Vehicule = require('../models/Vehicule');

exports.createVehicule = async (req, res) => {
  try {
    const vehicule = await Vehicule.create(req.body);
    res.status(201).json(vehicule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVehicules = async (req, res) => {
  try {
    const vehicules = await Vehicule.find();
    res.json(vehicules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
