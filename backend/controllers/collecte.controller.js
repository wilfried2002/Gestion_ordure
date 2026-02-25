const Collecte = require('../models/Collecte');
const Tournee  = require('../models/Tournee');
const Equipe   = require('../models/Equipe');
const { AppError } = require('../middlewares/error.middleware');

exports.createCollecte = async (req, res, next) => {
  try {
    const collecte = await Collecte.create({ ...req.body, agentId: req.user.id });
    const collectes = await Collecte.find({ tourneeId: collecte.tourneeId });
    const volumeTotal = collectes.reduce((s, c) => s + (c.volume || 0), 0);
    await Tournee.findByIdAndUpdate(collecte.tourneeId, { volumeTotal });
    res.status(201).json({ success: true, data: collecte });
  } catch (error) { next(error); }
};

// ADMIN : voir uniquement les collectes des tournées qu'il a créées
exports.getCollectes = async (req, res, next) => {
  try {
    const myTournees = await Tournee.find({ createdBy: req.user.id }).select('_id').lean();
    const tourneeIds = myTournees.map(t => t._id);

    const collectes = await Collecte.find({ tourneeId: { $in: tourneeIds } })
      .populate('tourneeId', 'date statut')
      .populate('quartierId', 'nom')
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: collectes.length, data: collectes });
  } catch (error) { next(error); }
};

exports.getCollecteById = async (req, res, next) => {
  try {
    const collecte = await Collecte.findById(req.params.id)
      .populate('tourneeId', 'date statut equipeId createdBy')
      .populate('quartierId', 'nom zoneId')
      .populate('agentId', 'name email');
    if (!collecte) return next(new AppError('Collecte non trouvée', 404));

    // ADMIN : vérifier que la tournée lui appartient
    if (req.user.role === 'ADMIN' && collecte.tourneeId?.createdBy?.toString() !== req.user.id) {
      return next(new AppError('Accès refusé', 403));
    }
    // AGENT : vérifier que la collecte lui est assignée
    if (req.user.role === 'AGENT' && collecte.agentId?._id?.toString() !== req.user.id) {
      return next(new AppError('Accès refusé', 403));
    }

    res.json({ success: true, data: collecte });
  } catch (error) { next(error); }
};

// Collectes d'une tournée (accès vérifié via la tournée)
exports.getCollectesByTournee = async (req, res, next) => {
  try {
    const collectes = await Collecte.find({ tourneeId: req.params.tourneeId })
      .populate('quartierId', 'nom')
      .populate('agentId', 'name');
    res.json({ success: true, count: collectes.length, data: collectes });
  } catch (error) { next(error); }
};

exports.updateCollecte = async (req, res, next) => {
  try {
    let filter = { _id: req.params.id };
    if (req.user.role === 'AGENT') filter.agentId = req.user.id;

    const collecte = await Collecte.findOneAndUpdate(filter, req.body, {
      new: true, runValidators: true,
    })
      .populate('tourneeId', 'date statut')
      .populate('quartierId', 'nom');
    if (!collecte) return next(new AppError('Collecte non trouvée ou accès refusé', 404));
    res.json({ success: true, data: collecte });
  } catch (error) { next(error); }
};

/* ─── AGENT – Valider un point de collecte ───────────────────────────────── */
exports.validerPoint = async (req, res, next) => {
  try {
    const { volume, commentaire } = req.body;
    const collecte = await Collecte.findById(req.params.id);
    if (!collecte) return next(new AppError('Point de collecte non trouvé', 404));

    // Agent : ne peut valider que les collectes de sa tournée
    if (req.user.role === 'AGENT') {
      const agentTournee = await Tournee.findOne({
        _id: collecte.tourneeId,
        equipeId: { $exists: true },
      }).select('equipeId').lean();
      if (!agentTournee) return next(new AppError('Tournée non trouvée', 404));
      const membre = await Equipe.findOne({ _id: agentTournee.equipeId, membres: req.user.id });
      if (!membre) return next(new AppError('Accès refusé : vous n\'êtes pas membre de cette équipe', 403));
    }

    collecte.statut      = 'Collecté';
    collecte.volume      = volume ?? collecte.volume;
    collecte.commentaire = commentaire ?? collecte.commentaire;
    collecte.agentId     = req.user.id;
    collecte.valideeLe   = new Date();
    await collecte.save();

    const all = await Collecte.find({ tourneeId: collecte.tourneeId });
    const volumeTotal = all.reduce((s, c) => s + (c.volume || 0), 0);
    await Tournee.findByIdAndUpdate(collecte.tourneeId, { volumeTotal });

    res.json({ success: true, message: 'Point validé', data: collecte });
  } catch (error) { next(error); }
};

// ADMIN : supprimer uniquement les collectes de ses tournées
exports.deleteCollecte = async (req, res, next) => {
  try {
    const myTournees = await Tournee.find({ createdBy: req.user.id }).select('_id').lean();
    const tourneeIds = myTournees.map(t => t._id);
    const collecte = await Collecte.findOneAndDelete({ _id: req.params.id, tourneeId: { $in: tourneeIds } });
    if (!collecte) return next(new AppError('Collecte non trouvée ou accès refusé', 404));
    res.json({ success: true, message: 'Collecte supprimée avec succès' });
  } catch (error) { next(error); }
};
