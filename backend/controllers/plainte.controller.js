const Plainte = require('../models/Plainte');
const { AppError } = require('../middlewares/error.middleware');

exports.createPlainte = async (req, res, next) => {
  try {
    const plainte = await Plainte.create({
      ...req.body,
      citoyenId: req.user.id,
    });
    res.status(201).json({ success: true, data: plainte });
  } catch (error) {
    next(error);
  }
};

exports.getPlaintes = async (req, res, next) => {
  try {
    const plaintes = await Plainte.find()
      .populate('citoyenId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: plaintes.length, data: plaintes });
  } catch (error) {
    next(error);
  }
};

exports.getPlainteById = async (req, res, next) => {
  try {
    const plainte = await Plainte.findById(req.params.id)
      .populate('citoyenId', 'name email')
      .populate('zoneId', 'nom arrondissement')
      .lean();
    if (!plainte) return next(new AppError('Plainte non trouvée', 404));
    res.json({ success: true, data: plainte });
  } catch (error) {
    next(error);
  }
};

// Citoyen : voir uniquement ses propres plaintes
exports.getMesPlaintes = async (req, res, next) => {
  try {
    const plaintes = await Plainte.find({ citoyenId: req.user.id })
      .populate('zoneId', 'nom arrondissement')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: plaintes.length, data: plaintes });
  } catch (error) {
    next(error);
  }
};

exports.updatePlainte = async (req, res, next) => {
  try {
    const plainte = await Plainte.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('citoyenId', 'name email').lean();
    if (!plainte) return next(new AppError('Plainte non trouvée', 404));
    res.json({ success: true, data: plainte });
  } catch (error) {
    next(error);
  }
};

exports.deletePlainte = async (req, res, next) => {
  try {
    const plainte = await Plainte.findByIdAndDelete(req.params.id);
    if (!plainte) return next(new AppError('Plainte non trouvée', 404));
    res.json({ success: true, message: 'Plainte supprimée avec succès' });
  } catch (error) {
    next(error);
  }
};
