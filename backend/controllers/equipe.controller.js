const Equipe = require('../models/Equipe');
const { AppError } = require('../middlewares/error.middleware');

exports.createEquipe = async (req, res, next) => {
  try {
    const equipe = await Equipe.create(req.body);
    res.status(201).json({ success: true, data: equipe });
  } catch (error) {
    next(error);
  }
};

exports.getEquipes = async (req, res, next) => {
  try {
    const equipes = await Equipe.find()
      .populate('membres', 'name email')
      .populate('vehiculeId', 'immatriculation statut');
    res.json({ success: true, count: equipes.length, data: equipes });
  } catch (error) {
    next(error);
  }
};

exports.getEquipeById = async (req, res, next) => {
  try {
    const equipe = await Equipe.findById(req.params.id)
      .populate('membres', 'name email role')
      .populate('vehiculeId', 'immatriculation capacite statut');
    if (!equipe) return next(new AppError('Équipe non trouvée', 404));
    res.json({ success: true, data: equipe });
  } catch (error) {
    next(error);
  }
};

exports.updateEquipe = async (req, res, next) => {
  try {
    const equipe = await Equipe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('membres', 'name email')
      .populate('vehiculeId', 'immatriculation statut');
    if (!equipe) return next(new AppError('Équipe non trouvée', 404));
    res.json({ success: true, data: equipe });
  } catch (error) {
    next(error);
  }
};

exports.deleteEquipe = async (req, res, next) => {
  try {
    const equipe = await Equipe.findByIdAndDelete(req.params.id);
    if (!equipe) return next(new AppError('Équipe non trouvée', 404));
    res.json({ success: true, message: 'Équipe supprimée avec succès' });
  } catch (error) {
    next(error);
  }
};

// Ajouter un agent à une équipe
exports.addMembre = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return next(new AppError('userId est requis', 400));
    const equipe = await Equipe.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { membres: userId } },
      { new: true }
    ).populate('membres', 'name email role');
    if (!equipe) return next(new AppError('Équipe non trouvée', 404));
    res.json({ success: true, data: equipe });
  } catch (error) {
    next(error);
  }
};

// Retirer un agent d'une équipe
exports.removeMembre = async (req, res, next) => {
  try {
    const equipe = await Equipe.findByIdAndUpdate(
      req.params.id,
      { $pull: { membres: req.params.userId } },
      { new: true }
    ).populate('membres', 'name email role');
    if (!equipe) return next(new AppError('Équipe non trouvée', 404));
    res.json({ success: true, data: equipe });
  } catch (error) {
    next(error);
  }
};
