const Bac  = require('../models/Bac');
const { AppError } = require('../middlewares/error.middleware');

// ══════════════════════════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════════════════════════

/** Distance (km) entre deux points GPS — formule de Haversine */
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Algorithme du plus proche voisin (Nearest Neighbor Heuristic).
 * Complexité O(n²) — efficace pour < 200 bacs.
 * Retourne l'itinéraire ordonné + distance totale en km.
 */
function nearestNeighbor(bacs) {
  if (!bacs.length) return { route: [], distanceTotaleKm: 0 };

  const unvisited = [...bacs];
  const route     = [unvisited.shift()];
  let   total     = 0;

  while (unvisited.length) {
    const last = route[route.length - 1];
    let   nearestIdx = 0;
    let   minDist    = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversine(
        last.latitude, last.longitude,
        unvisited[i].latitude, unvisited[i].longitude,
      );
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }

    total += minDist;
    route.push(unvisited.splice(nearestIdx, 1)[0]);
  }

  return { route, distanceTotaleKm: Math.round(total * 10) / 10 };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CRUD
// ══════════════════════════════════════════════════════════════════════════════

exports.getBacs = async (req, res, next) => {
  try {
    const filter = { createdBy: req.user.id };
    if (req.query.zoneId)  filter.zoneId = req.query.zoneId;
    if (req.query.statut)  filter.statut = req.query.statut;

    const bacs = await Bac.find(filter)
      .populate('zoneId', 'nom arrondissement')
      .sort({ codeBac: 1 })
      .lean();
    res.json({ success: true, count: bacs.length, data: bacs });
  } catch (err) { next(err); }
};

exports.getBacById = async (req, res, next) => {
  try {
    const bac = await Bac.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('zoneId', 'nom arrondissement')
      .lean();
    if (!bac) return next(new AppError('Bac non trouvé', 404));
    res.json({ success: true, data: bac });
  } catch (err) { next(err); }
};

exports.createBac = async (req, res, next) => {
  try {
    const bac = await Bac.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: bac });
  } catch (err) { next(err); }
};

exports.updateBac = async (req, res, next) => {
  try {
    // findOne + save pour déclencher le pre-save hook (statut auto)
    const bac = await Bac.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!bac) return next(new AppError('Bac non trouvé', 404));

    Object.assign(bac, req.body);
    await bac.save();
    res.json({ success: true, data: bac });
  } catch (err) { next(err); }
};

exports.deleteBac = async (req, res, next) => {
  try {
    const bac = await Bac.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!bac) return next(new AppError('Bac non trouvé', 404));
    res.json({ success: true, message: 'Bac supprimé avec succès' });
  } catch (err) { next(err); }
};

// ── PATCH /:id/niveau ──────────────────────────────────────────────────────
/** Met à jour uniquement le niveau de remplissage (+ recalcul statut via hook) */
exports.updateNiveau = async (req, res, next) => {
  try {
    const { niveauRemplissage } = req.body;
    if (niveauRemplissage === undefined || niveauRemplissage < 0 || niveauRemplissage > 100) {
      return next(new AppError('niveauRemplissage doit être entre 0 et 100', 400));
    }

    const bac = await Bac.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!bac) return next(new AppError('Bac non trouvé', 404));

    bac.niveauRemplissage = niveauRemplissage;
    await bac.save(); // déclenche le hook pre-save → statut recalculé

    // Notification temps-réel aux admins connectés
    const io = req.app.get('io');
    if (io) {
      io.emit('bac-niveau-update', {
        _id:               bac._id,
        codeBac:           bac.codeBac,
        niveauRemplissage: bac.niveauRemplissage,
        statut:            bac.statut,
      });
    }

    res.json({ success: true, data: bac });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════════════════════
//  Optimisation de tournée (TSP – Nearest Neighbor)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/bacs/tournee-optimisee
 * Body (au choix, combinables) :
 *   { niveauMin?: number, zoneId?: string, bacIds?: string[] }
 *
 * Retourne l'itinéraire ordonné + distance totale estimée.
 */
exports.optimiserTournee = async (req, res, next) => {
  try {
    const { niveauMin = 0, zoneId, bacIds } = req.body;

    let filter = { createdBy: req.user.id };

    if (bacIds && bacIds.length) {
      // Sélection manuelle de bacs
      filter._id = { $in: bacIds };
    } else {
      // Sélection automatique par niveau de remplissage (et zone optionnelle)
      filter.niveauRemplissage = { $gte: Number(niveauMin) };
      if (zoneId) filter.zoneId = zoneId;
    }

    const bacs = await Bac.find(filter)
      .populate('zoneId', 'nom arrondissement')
      .lean();

    if (!bacs.length) {
      return res.json({
        success: true,
        message: 'Aucun bac correspondant aux critères.',
        data: { route: [], distanceTotaleKm: 0, nbBacs: 0 },
      });
    }

    const result = nearestNeighbor(bacs);

    res.json({
      success: true,
      data: {
        route:            result.route,
        distanceTotaleKm: result.distanceTotaleKm,
        nbBacs:           result.route.length,
      },
    });
  } catch (err) { next(err); }
};

// ── Statistiques rapides pour le dashboard carte ──────────────────────────
exports.getStatsBacs = async (req, res, next) => {
  try {
    const base = { createdBy: req.user.id };
    const [total, pleins, moyens, vides] = await Promise.all([
      Bac.countDocuments(base),
      Bac.countDocuments({ ...base, statut: 'Plein'  }),
      Bac.countDocuments({ ...base, statut: 'Moyen'  }),
      Bac.countDocuments({ ...base, statut: 'Vide'   }),
    ]);

    // Répartition par zone (top 10)
    const parZone = await Bac.aggregate([
      { $match: base },
      { $group: { _id: '$zoneId', count: { $sum: 1 }, pleins: { $sum: { $cond: [{ $eq: ['$statut', 'Plein'] }, 1, 0] } } } },
      { $sort: { pleins: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'zones', localField: '_id', foreignField: '_id', as: 'zone' } },
      { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, count: 1, pleins: 1, nomZone: '$zone.nom' } },
    ]);

    res.json({ success: true, data: { total, pleins, moyens, vides, parZone } });
  } catch (err) { next(err); }
};
