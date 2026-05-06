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

// ── PATCH /:id/position — mis à jour par le chauffeur via Socket.IO HTTP ───
/**
 * Reçoit { lat, lng } et :
 *   1. Persiste la position dans MongoDB
 *   2. Émet l'événement Socket.IO "vehicule-position" à tous les admins
 */
exports.updatePosition = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return next(new AppError('lat et lng sont requis', 400));
    }

    const vehicule = await Vehicule.findByIdAndUpdate(
      req.params.id,
      { localisationGPS: { lat, lng } },
      { new: true, runValidators: false },
    );
    if (!vehicule) return next(new AppError('Véhicule non trouvé', 404));

    // Broadcast aux admins via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('vehicule-position', {
        vehiculeId:     vehicule._id,
        immatriculation: vehicule.immatriculation,
        lat,
        lng,
        statut:         vehicule.statut,
        updatedAt:      new Date(),
      });
    }

    res.json({ success: true, data: { vehiculeId: vehicule._id, lat, lng } });
  } catch (error) { next(error); }
};
