const Quartier = require('../models/Quartier');
const { AppError } = require('../middlewares/error.middleware');

exports.createQuartier = async (req, res, next) => {
  try {
    const quartier = await Quartier.create(req.body);
    res.status(201).json({ success: true, data: quartier });
  } catch (error) {
    next(error);
  }
};

exports.getQuartiers = async (req, res, next) => {
  try {
    const quartiers = await Quartier.find().populate('zoneId', 'nom');
    res.json({ success: true, count: quartiers.length, data: quartiers });
  } catch (error) {
    next(error);
  }
};

exports.getQuartierById = async (req, res, next) => {
  try {
    const quartier = await Quartier.findById(req.params.id).populate('zoneId', 'nom');
    if (!quartier) return next(new AppError('Quartier non trouvé', 404));
    res.json({ success: true, data: quartier });
  } catch (error) {
    next(error);
  }
};

exports.updateQuartier = async (req, res, next) => {
  try {
    const quartier = await Quartier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('zoneId', 'nom');
    if (!quartier) return next(new AppError('Quartier non trouvé', 404));
    res.json({ success: true, data: quartier });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuartier = async (req, res, next) => {
  try {
    const quartier = await Quartier.findByIdAndDelete(req.params.id);
    if (!quartier) return next(new AppError('Quartier non trouvé', 404));
    res.json({ success: true, message: 'Quartier supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};
