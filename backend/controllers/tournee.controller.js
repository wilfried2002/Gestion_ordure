const Tournee  = require('../models/Tournee');
const Equipe   = require('../models/Equipe');
const Collecte = require('../models/Collecte');
const { AppError } = require('../middlewares/error.middleware');

/* ─── ADMIN CRUD ─────────────────────────────────────────────────────────── */

exports.createTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.create(req.body);
    res.status(201).json({ success: true, data: tournee });
  } catch (error) { next(error); }
};

exports.getTournees = async (req, res, next) => {
  try {
    const tournees = await Tournee.find()
      .populate('equipeId', 'nom vehiculeId')
      .populate('zoneId', 'nom')
      .populate('vehiculeId', 'immatriculation type')
      .populate('quartiers', 'nom')
      .sort({ date: -1 });
    res.json({ success: true, count: tournees.length, data: tournees });
  } catch (error) { next(error); }
};

exports.getTourneeById = async (req, res, next) => {
  try {
    const tournee = await Tournee.findById(req.params.id)
      .populate('equipeId', 'nom vehiculeId membres')
      .populate('zoneId', 'nom arrondissement')
      .populate('vehiculeId', 'immatriculation type capacite')
      .populate('quartiers', 'nom zoneId');
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    res.json({ success: true, data: tournee });
  } catch (error) { next(error); }
};

exports.updateTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    })
      .populate('equipeId', 'nom')
      .populate('zoneId', 'nom')
      .populate('quartiers', 'nom');
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    res.json({ success: true, data: tournee });
  } catch (error) { next(error); }
};

exports.deleteTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.findByIdAndDelete(req.params.id);
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    res.json({ success: true, message: 'Tournée supprimée avec succès' });
  } catch (error) { next(error); }
};

/* ─── AGENT – Mes tournées ───────────────────────────────────────────────── */

exports.getMesTournees = async (req, res, next) => {
  try {
    // Trouver les équipes dont l'agent est membre
    const equipes = await Equipe.find({ membres: req.user.id });
    const equipeIds = equipes.map(e => e._id);

    const tournees = await Tournee.find({ equipeId: { $in: equipeIds } })
      .populate('equipeId', 'nom vehiculeId')
      .populate('zoneId', 'nom arrondissement')
      .populate('vehiculeId', 'immatriculation type')
      .populate('quartiers', 'nom')
      .sort({ date: -1 });

    res.json({ success: true, count: tournees.length, data: tournees });
  } catch (error) { next(error); }
};

/* ─── AGENT – Démarrer une tournée ──────────────────────────────────────── */

exports.demarrerTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.findById(req.params.id).populate('quartiers', 'nom');
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    if (tournee.statut !== 'Planifiée')
      return next(new AppError(`Impossible de démarrer une tournée en statut "${tournee.statut}"`, 400));

    // Passer en "En cours" et enregistrer l'heure réelle
    tournee.statut = 'En cours';
    tournee.heureDebutReel = new Date();
    await tournee.save();

    // Créer automatiquement un point de collecte pour chaque quartier
    if (tournee.quartiers && tournee.quartiers.length > 0) {
      const points = tournee.quartiers.map(q => ({
        tourneeId: tournee._id,
        quartierId: q._id,
        agentId: req.user.id,
        statut: 'Planifié',
        volume: 0,
      }));
      // Créer seulement s'il n'en existe pas encore
      const existing = await Collecte.countDocuments({ tourneeId: tournee._id });
      if (existing === 0) await Collecte.insertMany(points);
    }

    const updated = await Tournee.findById(req.params.id)
      .populate('equipeId', 'nom')
      .populate('zoneId', 'nom')
      .populate('vehiculeId', 'immatriculation')
      .populate('quartiers', 'nom');

    res.json({ success: true, message: 'Tournée démarrée', data: updated });
  } catch (error) { next(error); }
};

/* ─── AGENT – Terminer une tournée ──────────────────────────────────────── */

exports.terminerTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.findById(req.params.id);
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    if (tournee.statut !== 'En cours')
      return next(new AppError(`Impossible de terminer une tournée en statut "${tournee.statut}"`, 400));

    // Recalculer le volume total
    const collectes = await Collecte.find({ tourneeId: tournee._id });
    const volumeTotal = collectes.reduce((s, c) => s + (c.volume || 0), 0);

    tournee.statut = 'Terminée';
    tournee.heureFinReel = new Date();
    tournee.volumeTotal = volumeTotal;
    await tournee.save();

    res.json({ success: true, message: 'Tournée terminée', data: tournee });
  } catch (error) { next(error); }
};
