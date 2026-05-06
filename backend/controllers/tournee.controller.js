const Tournee    = require('../models/Tournee');
const Equipe     = require('../models/Equipe');
const Collecte   = require('../models/Collecte');
const Vehicule   = require('../models/Vehicule');
const { AppError } = require('../middlewares/error.middleware');

/* ─── ADMIN CRUD ─────────────────────────────────────────────────────────── */

exports.createTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: tournee });
  } catch (error) { next(error); }
};

exports.getTournees = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'ADMIN') {
      // Admin voit uniquement les tournées qu'il a créées (index: createdBy + date)
      filter = { createdBy: req.user.id };

    } else if (req.user.role === 'AGENT') {
      // Agent voit les tournées de ses équipes
      const equipes = await Equipe.find({ membres: req.user.id }).select('_id').lean();
      filter = { equipeId: { $in: equipes.map(e => e._id) } };

    } else {
      // CITOYEN – planning public : tournées à venir + 45 derniers jours uniquement
      // Évite un full-scan sur toute la collection
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      filter = {
        date: { $gte: cutoff },
        statut: { $ne: 'Annulée' },
      };
    }

    const tournees = await Tournee.find(filter)
      .populate('equipeId', 'nom')
      .populate('zoneId',   'nom')
      .populate('vehiculeId', 'immatriculation type')
      .populate('quartiers', 'nom')
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, count: tournees.length, data: tournees });
  } catch (error) { next(error); }
};

exports.getTourneeById = async (req, res, next) => {
  try {
    const tournee = await Tournee.findById(req.params.id)
      .populate('equipeId', 'nom vehiculeId membres')
      .populate('zoneId', 'nom arrondissement')
      .populate('vehiculeId', 'immatriculation type capacite')
      .populate('quartiers', 'nom zoneId')
      .lean();
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));

    // ADMIN : vérifier la propriété
    if (req.user.role === 'ADMIN' && tournee.createdBy?.toString() !== req.user.id) {
      return next(new AppError('Accès refusé', 403));
    }
    // AGENT : vérifier qu'il est membre de l'équipe
    if (req.user.role === 'AGENT') {
      const equipe = await Equipe.findOne({ _id: tournee.equipeId, membres: req.user.id });
      if (!equipe) return next(new AppError('Accès refusé', 403));
    }

    res.json({ success: true, data: tournee });
  } catch (error) { next(error); }
};

exports.updateTournee = async (req, res, next) => {
  try {
    let filter = { _id: req.params.id };
    if (req.user.role === 'ADMIN') filter.createdBy = req.user.id;

    const tournee = await Tournee.findOneAndUpdate(filter, req.body, {
      new: true, runValidators: true,
    })
      .populate('equipeId', 'nom')
      .populate('zoneId', 'nom')
      .populate('quartiers', 'nom')
      .lean();
    if (!tournee) return next(new AppError('Tournée non trouvée ou accès refusé', 404));
    res.json({ success: true, data: tournee });
  } catch (error) { next(error); }
};

exports.deleteTournee = async (req, res, next) => {
  try {
    const tournee = await Tournee.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!tournee) return next(new AppError('Tournée non trouvée ou accès refusé', 404));
    res.json({ success: true, message: 'Tournée supprimée avec succès' });
  } catch (error) { next(error); }
};

/* ─── AGENT – Mes tournées ───────────────────────────────────────────────── */

exports.getMesTournees = async (req, res, next) => {
  try {
    const equipes   = await Equipe.find({ membres: req.user.id }).select('_id').lean();
    const equipeIds = equipes.map(e => e._id);

    // Limite aux 90 derniers jours + tournées futures — réduit la taille du résultat
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const tournees = await Tournee.find({
      equipeId: { $in: equipeIds },
      date:     { $gte: cutoff },
    })
      .populate('equipeId',  'nom vehiculeId')
      .populate('zoneId',    'nom arrondissement')
      .populate('vehiculeId','immatriculation type')
      .populate('quartiers', 'nom')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, count: tournees.length, data: tournees });
  } catch (error) { next(error); }
};

/* ─── AGENT – Démarrer une tournée ──────────────────────────────────────── */

exports.demarrerTournee = async (req, res, next) => {
  try {
    // Seul un agent avec le poste CHAUFFEUR peut démarrer une tournée
    if (req.user.poste !== 'CHAUFFEUR') {
      return next(new AppError('Accès refusé : seul le chauffeur désigné peut démarrer la tournée.', 403));
    }

    const tournee = await Tournee.findById(req.params.id).populate('quartiers', 'nom');
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    if (tournee.statut !== 'Planifiée')
      return next(new AppError(`Impossible de démarrer une tournée en statut "${tournee.statut}"`, 400));

    // Vérifier que l'agent est bien dans l'équipe
    const equipe = await Equipe.findOne({ _id: tournee.equipeId, membres: req.user.id });
    if (!equipe) return next(new AppError('Accès refusé : vous n\'êtes pas membre de cette équipe', 403));

    tournee.statut = 'En cours';
    tournee.heureDebutReel = new Date();
    await tournee.save();

    // Mettre le véhicule assigné en statut "En tournée"
    if (tournee.vehiculeId) {
      await Vehicule.findByIdAndUpdate(tournee.vehiculeId, { statut: 'En tournée' });
    }

    if (tournee.quartiers && tournee.quartiers.length > 0) {
      const points = tournee.quartiers.map(q => ({
        tourneeId: tournee._id,
        quartierId: q._id,
        agentId: req.user.id,
        statut: 'Planifié',
        volume: 0,
      }));
      const existing = await Collecte.countDocuments({ tourneeId: tournee._id });
      if (existing === 0) await Collecte.insertMany(points);
    }

    const updated = await Tournee.findById(req.params.id)
      .populate('equipeId', 'nom')
      .populate('zoneId', 'nom')
      .populate('vehiculeId', 'immatriculation')
      .populate('quartiers', 'nom')
      .lean();

    res.json({ success: true, message: 'Tournée démarrée', data: updated });
  } catch (error) { next(error); }
};

/* ─── AGENT – Terminer une tournée ──────────────────────────────────────── */

exports.terminerTournee = async (req, res, next) => {
  try {
    // Seul un agent avec le poste CHAUFFEUR peut terminer une tournée
    if (req.user.poste !== 'CHAUFFEUR') {
      return next(new AppError('Accès refusé : seul le chauffeur désigné peut terminer la tournée.', 403));
    }

    const tournee = await Tournee.findById(req.params.id);
    if (!tournee) return next(new AppError('Tournée non trouvée', 404));
    if (tournee.statut !== 'En cours')
      return next(new AppError(`Impossible de terminer une tournée en statut "${tournee.statut}"`, 400));

    // Vérifier que l'agent est bien dans l'équipe
    const equipe = await Equipe.findOne({ _id: tournee.equipeId, membres: req.user.id });
    if (!equipe) return next(new AppError('Accès refusé : vous n\'êtes pas membre de cette équipe', 403));

    const collectes = await Collecte.find({ tourneeId: tournee._id }).select('volume').lean();
    const volumeTotal = collectes.reduce((s, c) => s + (c.volume || 0), 0);

    tournee.statut = 'Terminée';
    tournee.heureFinReel = new Date();
    tournee.volumeTotal = volumeTotal;
    await tournee.save();

    // Remettre le véhicule en "Disponible"
    if (tournee.vehiculeId) {
      await Vehicule.findByIdAndUpdate(tournee.vehiculeId, { statut: 'Disponible' });
    }

    res.json({ success: true, message: 'Tournée terminée', data: tournee });
  } catch (error) { next(error); }
};
