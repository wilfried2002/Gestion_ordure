const Quartier   = require('../models/Quartier');
const { AppError } = require('../middlewares/error.middleware');
const adminScope   = require('../utils/scopeFilter');

exports.createQuartier = async (req, res, next) => {
  try {
    const quartier = await Quartier.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: quartier });
  } catch (error) { next(error); }
};

exports.getQuartiers = async (req, res, next) => {
  try {
    // ADMIN → uniquement ses quartiers | AGENT/CITOYEN → tous (référence)
    const quartiers = await Quartier.find(adminScope(req)).populate('zoneId', 'nom');
    res.json({ success: true, count: quartiers.length, data: quartiers });
  } catch (error) { next(error); }
};

exports.getQuartierById = async (req, res, next) => {
  try {
    const quartier = await Quartier.findOne({ _id: req.params.id, ...adminScope(req) })
      .populate('zoneId', 'nom');
    if (!quartier) return next(new AppError('Quartier non trouvé', 404));
    res.json({ success: true, data: quartier });
  } catch (error) { next(error); }
};

exports.updateQuartier = async (req, res, next) => {
  try {
    const quartier = await Quartier.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    ).populate('zoneId', 'nom');
    if (!quartier) return next(new AppError('Quartier non trouvé ou accès refusé', 404));
    res.json({ success: true, data: quartier });
  } catch (error) { next(error); }
};

exports.deleteQuartier = async (req, res, next) => {
  try {
    const quartier = await Quartier.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!quartier) return next(new AppError('Quartier non trouvé ou accès refusé', 404));
    res.json({ success: true, message: 'Quartier supprimé avec succès' });
  } catch (error) { next(error); }
};
