const Equipe     = require('../models/Equipe');
const { AppError } = require('../middlewares/error.middleware');
const adminScope   = require('../utils/scopeFilter');

exports.createEquipe = async (req, res, next) => {
  try {
    // Règle : un véhicule ne peut être assigné qu'à une seule équipe
    if (req.body.vehiculeId) {
      const existing = await Equipe.findOne({ vehiculeId: req.body.vehiculeId, createdBy: req.user.id }).lean();
      if (existing) {
        return next(new AppError(
          `Ce véhicule est déjà assigné à l'équipe "${existing.nom}". Un véhicule ne peut pas être partagé entre plusieurs équipes.`,
          409
        ));
      }
    }
    const equipe = await Equipe.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: equipe });
  } catch (error) { next(error); }
};

exports.getEquipes = async (req, res, next) => {
  try {
    // ADMIN → uniquement ses équipes | AGENT → les siennes (via getMesEquipes si besoin)
    const equipes = await Equipe.find(adminScope(req))
      .populate('membres', 'name email')
      .populate('vehiculeId', 'immatriculation statut')
      .lean();
    res.json({ success: true, count: equipes.length, data: equipes });
  } catch (error) { next(error); }
};

exports.getEquipeById = async (req, res, next) => {
  try {
    const equipe = await Equipe.findOne({ _id: req.params.id, ...adminScope(req) })
      .populate('membres', 'name email role')
      .populate('vehiculeId', 'immatriculation capacite statut')
      .lean();
    if (!equipe) return next(new AppError('Équipe non trouvée', 404));
    res.json({ success: true, data: equipe });
  } catch (error) { next(error); }
};

exports.updateEquipe = async (req, res, next) => {
  try {
    // Règle : un véhicule ne peut être assigné qu'à une seule équipe
    if (req.body.vehiculeId) {
      const existing = await Equipe.findOne({
        vehiculeId: req.body.vehiculeId,
        createdBy: req.user.id,
        _id: { $ne: req.params.id },
      }).lean();
      if (existing) {
        return next(new AppError(
          `Ce véhicule est déjà assigné à l'équipe "${existing.nom}". Un véhicule ne peut pas être partagé entre plusieurs équipes.`,
          409
        ));
      }
    }
    const equipe = await Equipe.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('membres', 'name email')
      .populate('vehiculeId', 'immatriculation statut')
      .lean();
    if (!equipe) return next(new AppError('Équipe non trouvée ou accès refusé', 404));
    res.json({ success: true, data: equipe });
  } catch (error) { next(error); }
};

exports.deleteEquipe = async (req, res, next) => {
  try {
    const equipe = await Equipe.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!equipe) return next(new AppError('Équipe non trouvée ou accès refusé', 404));
    res.json({ success: true, message: 'Équipe supprimée avec succès' });
  } catch (error) { next(error); }
};

// Ajouter un agent à une équipe (vérifie la propriété)
exports.addMembre = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return next(new AppError('userId est requis', 400));

    // Règle : un agent ne peut appartenir qu'à une seule équipe
    const autreEquipe = await Equipe.findOne({
      membres: userId,
      createdBy: req.user.id,
      _id: { $ne: req.params.id },
    }).lean();
    if (autreEquipe) {
      return next(new AppError(
        `Cet agent est déjà membre de l'équipe "${autreEquipe.nom}". Un agent ne peut appartenir qu'à une seule équipe à la fois.`,
        409
      ));
    }

    const equipe = await Equipe.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $addToSet: { membres: userId } },
      { new: true }
    ).populate('membres', 'name email role').lean();
    if (!equipe) return next(new AppError('Équipe non trouvée ou accès refusé', 404));
    res.json({ success: true, data: equipe });
  } catch (error) { next(error); }
};

// Retirer un agent d'une équipe (vérifie la propriété)
exports.removeMembre = async (req, res, next) => {
  try {
    const equipe = await Equipe.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $pull: { membres: req.params.userId } },
      { new: true }
    ).populate('membres', 'name email role').lean();
    if (!equipe) return next(new AppError('Équipe non trouvée ou accès refusé', 404));
    res.json({ success: true, data: equipe });
  } catch (error) { next(error); }
};
