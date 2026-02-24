const Collecte = require('../models/Collecte');
const Tournee  = require('../models/Tournee');
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

exports.getCollectes = async (req, res, next) => {
  try {
    const collectes = await Collecte.find()
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
      .populate('tourneeId', 'date statut equipeId')
      .populate('quartierId', 'nom zoneId')
      .populate('agentId', 'name email');
    if (!collecte) return next(new AppError('Collecte non trouvée', 404));
    res.json({ success: true, data: collecte });
  } catch (error) { next(error); }
};

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
    const collecte = await Collecte.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    })
      .populate('tourneeId', 'date statut')
      .populate('quartierId', 'nom');
    if (!collecte) return next(new AppError('Collecte non trouvée', 404));
    res.json({ success: true, data: collecte });
  } catch (error) { next(error); }
};

/* ─── AGENT – Valider un point de collecte ───────────────────────────────── */
exports.validerPoint = async (req, res, next) => {
  try {
    const { volume, commentaire } = req.body;
    const collecte = await Collecte.findById(req.params.id);
    if (!collecte) return next(new AppError('Point de collecte non trouvé', 404));

    collecte.statut      = 'Collecté';
    collecte.volume      = volume ?? collecte.volume;
    collecte.commentaire = commentaire ?? collecte.commentaire;
    collecte.agentId     = req.user.id;
    collecte.valideeLe   = new Date();
    await collecte.save();

    // Recalcul volumeTotal tournée
    const all = await Collecte.find({ tourneeId: collecte.tourneeId });
    const volumeTotal = all.reduce((s, c) => s + (c.volume || 0), 0);
    await Tournee.findByIdAndUpdate(collecte.tourneeId, { volumeTotal });

    res.json({ success: true, message: 'Point validé', data: collecte });
  } catch (error) { next(error); }
};

exports.deleteCollecte = async (req, res, next) => {
  try {
    const collecte = await Collecte.findByIdAndDelete(req.params.id);
    if (!collecte) return next(new AppError('Collecte non trouvée', 404));
    res.json({ success: true, message: 'Collecte supprimée avec succès' });
  } catch (error) { next(error); }
};
