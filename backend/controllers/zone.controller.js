const Zone       = require('../models/Zone');
const { AppError } = require('../middlewares/error.middleware');
const adminScope   = require('../utils/scopeFilter');

exports.createZone = async (req, res, next) => {
  try {
    const zone = await Zone.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: zone });
  } catch (error) { next(error); }
};

exports.getZones = async (req, res, next) => {
  try {
    // ADMIN → uniquement ses zones | AGENT/CITOYEN → toutes (données de référence)
    const zones = await Zone.find(adminScope(req));
    res.json({ success: true, count: zones.length, data: zones });
  } catch (error) { next(error); }
};

exports.getZoneById = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({ _id: req.params.id, ...adminScope(req) });
    if (!zone) return next(new AppError('Zone non trouvée', 404));
    res.json({ success: true, data: zone });
  } catch (error) { next(error); }
};

exports.updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!zone) return next(new AppError('Zone non trouvée ou accès refusé', 404));
    res.json({ success: true, data: zone });
  } catch (error) { next(error); }
};

exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!zone) return next(new AppError('Zone non trouvée ou accès refusé', 404));
    res.json({ success: true, message: 'Zone supprimée avec succès' });
  } catch (error) { next(error); }
};
