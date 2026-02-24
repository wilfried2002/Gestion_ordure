const Vehicule = require('../models/Vehicule');
const { AppError } = require('../middlewares/error.middleware');

exports.createVehicule = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.create(req.body);
    res.status(201).json({ success: true, data: vehicule });
  } catch (error) {
    next(error);
  }
};

exports.getVehicules = async (req, res, next) => {
  try {
    const vehicules = await Vehicule.find();
    res.json({ success: true, count: vehicules.length, data: vehicules });
  } catch (error) {
    next(error);
  }
};

exports.getVehiculeById = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.findById(req.params.id);
    if (!vehicule) return next(new AppError('Véhicule non trouvé', 404));
    res.json({ success: true, data: vehicule });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicule = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vehicule) return next(new AppError('Véhicule non trouvé', 404));
    res.json({ success: true, data: vehicule });
  } catch (error) {
    next(error);
  }
};

exports.deleteVehicule = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.findByIdAndDelete(req.params.id);
    if (!vehicule) return next(new AppError('Véhicule non trouvé', 404));
    res.json({ success: true, message: 'Véhicule supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};
