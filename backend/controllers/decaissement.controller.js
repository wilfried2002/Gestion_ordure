const Decaissement = require('../models/Decaissement');
const Equipe       = require('../models/Equipe');

// ── Admin : créer un décaissement ─────────────────────────────────────────

exports.create = async (req, res, next) => {
  try {
    const { equipeId, mois, annee, montant, note } = req.body;
    if (!equipeId || !mois || !annee || montant == null) {
      return res.status(400).json({ success: false, message: 'equipeId, mois, annee et montant sont requis.' });
    }
    const dec = await Decaissement.create({
      equipeId, mois, annee, montant, note, createdBy: req.user.id,
    });
    const populated = await dec.populate([
      { path: 'equipeId', select: 'nom membres' },
      { path: 'createdBy', select: 'name' },
    ]);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

// ── Admin : lister tous les décaissements ─────────────────────────────────

exports.getAll = async (req, res, next) => {
  try {
    const filter = { createdBy: req.user.id };
    if (req.query.mois)  filter.mois  = parseInt(req.query.mois);
    if (req.query.annee) filter.annee = parseInt(req.query.annee);
    if (req.query.statut) filter.statut = req.query.statut;

    const decaissements = await Decaissement.find(filter)
      .populate('equipeId', 'nom membres')
      .populate('decaissePar', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: decaissements });
  } catch (err) { next(err); }
};

// ── Admin : mettre à jour le statut ──────────────────────────────────────

exports.updateStatut = async (req, res, next) => {
  try {
    const { statut, note } = req.body;
    const update = { statut };
    if (note !== undefined) update.note = note;
    if (statut === 'Décaissé') {
      update.decaisseLe  = new Date();
      update.decaissePar = req.user.id;
    }
    const dec = await Decaissement.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      update,
      { new: true },
    )
    .populate('equipeId', 'nom')
    .populate('decaissePar', 'name')
    .lean();

    if (!dec) return res.status(404).json({ success: false, message: 'Décaissement introuvable.' });
    res.json({ success: true, data: dec });
  } catch (err) { next(err); }
};

// ── Agent : voir les décaissements de son équipe ──────────────────────────

exports.getForAgent = async (req, res, next) => {
  try {
    // Trouver les équipes dont cet agent est membre
    const equipes = await Equipe.find({ membres: req.user.id }).select('_id nom').lean();
    if (!equipes.length) return res.json({ success: true, data: [] });

    const equipeIds = equipes.map(e => e._id);
    const decaissements = await Decaissement.find({ equipeId: { $in: equipeIds } })
      .populate('equipeId', 'nom')
      .populate('decaissePar', 'name')
      .sort({ annee: -1, mois: -1 })
      .lean();

    res.json({ success: true, data: decaissements });
  } catch (err) { next(err); }
};
