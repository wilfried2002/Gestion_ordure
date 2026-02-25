const Vehicule   = require('../models/Vehicule');
const { AppError } = require('../middlewares/error.middleware');
const adminScope   = require('../utils/scopeFilter');

exports.createVehicule = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: vehicule });
  } catch (error) { next(error); }
};

exports.getVehicules = async (req, res, next) => {
  try {
    // ADMIN → uniquement ses véhicules | AGENT → tous (référence pour les tournées)
    const vehicules = await Vehicule.find(adminScope(req));
    res.json({ success: true, count: vehicules.length, data: vehicules });
  } catch (error) { next(error); }
};

exports.getVehiculeById = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.findOne({ _id: req.params.id, ...adminScope(req) });
    if (!vehicule) return next(new AppError('Véhicule non trouvé', 404));
    res.json({ success: true, data: vehicule });
  } catch (error) { next(error); }
};

exports.updateVehicule = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!vehicule) return next(new AppError('Véhicule non trouvé ou accès refusé', 404));
    res.json({ success: true, data: vehicule });
  } catch (error) { next(error); }
};

exports.deleteVehicule = async (req, res, next) => {
  try {
    const vehicule = await Vehicule.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!vehicule) return next(new AppError('Véhicule non trouvé ou accès refusé', 404));
    res.json({ success: true, message: 'Véhicule supprimé avec succès' });
  } catch (error) { next(error); }
};
