const Zone = require('../models/Zone');
const { AppError } = require('../middlewares/error.middleware');

exports.createZone = async (req, res, next) => {
  try {
    const zone = await Zone.create(req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    next(error);
  }
};

exports.getZones = async (req, res, next) => {
  try {
    const zones = await Zone.find();
    res.json({ success: true, count: zones.length, data: zones });
  } catch (error) {
    next(error);
  }
};

exports.getZoneById = async (req, res, next) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return next(new AppError('Zone non trouvée', 404));
    res.json({ success: true, data: zone });
  } catch (error) {
    next(error);
  }
};

exports.updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!zone) return next(new AppError('Zone non trouvée', 404));
    res.json({ success: true, data: zone });
  } catch (error) {
    next(error);
  }
};

exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) return next(new AppError('Zone non trouvée', 404));
    res.json({ success: true, message: 'Zone supprimée avec succès' });
  } catch (error) {
    next(error);
  }
};
