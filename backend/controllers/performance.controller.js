const Tournee    = require('../models/Tournee');
const Collecte   = require('../models/Collecte');
const Equipe     = require('../models/Equipe');
const PrimeConfig = require('../models/PrimeConfig');

const DEFAULT_CONFIG = { primeParTournee: 5000, primeParCollecte: 500 };

// ── Config des primes ──────────────────────────────────────────────────────

exports.getConfig = async (req, res, next) => {
  try {
    const config = await PrimeConfig.findOne({ createdBy: req.user.id }).lean();
    res.json({ success: true, data: config ?? DEFAULT_CONFIG });
  } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const { primeParTournee, primeParCollecte } = req.body;
    const config = await PrimeConfig.findOneAndUpdate(
      { createdBy: req.user.id },
      { primeParTournee, primeParCollecte, createdBy: req.user.id },
      { upsert: true, new: true, runValidators: true },
    );
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

// ── Performances mensuelles ────────────────────────────────────────────────

/**
 * GET /api/performances?mois=&annee=
 * Calcule les performances de chaque équipe sur le mois/année demandé.
 */
exports.getPerformances = async (req, res, next) => {
  try {
    const now   = new Date();
    const mois  = parseInt(req.query.mois)  || (now.getMonth() + 1);
    const annee = parseInt(req.query.annee) || now.getFullYear();

    const debut = new Date(annee, mois - 1, 1);
    const fin   = new Date(annee, mois, 0, 23, 59, 59);

    // Récupérer la config des primes
    const config = await PrimeConfig.findOne({ createdBy: req.user.id }).lean()
      ?? DEFAULT_CONFIG;

    // Toutes les équipes de cet admin
    const equipes = await Equipe.find({ createdBy: req.user.id })
      .populate('membres', 'name email poste')
      .lean();

    // Toutes les tournées du mois pour cet admin
    const tournees = await Tournee.find({
      createdBy: req.user.id,
      date: { $gte: debut, $lte: fin },
    }).lean();

    // Collectes effectuées pour ces tournées
    const tourneeIds = tournees.map(t => t._id);
    const collectes  = tourneeIds.length
      ? await Collecte.find({ tourneeId: { $in: tourneeIds }, statut: 'Collecté' }).lean()
      : [];

    // Index collectes par tourneeId
    const collecteMap = new Map();
    collectes.forEach(c => {
      const k = c.tourneeId.toString();
      if (!collecteMap.has(k)) collecteMap.set(k, []);
      collecteMap.get(k).push(c);
    });

    // Calculer les performances par équipe
    const performances = equipes.map(equipe => {
      const eqTournees        = tournees.filter(t => t.equipeId?.toString() === equipe._id.toString());
      const nbTournees        = eqTournees.length;
      const nbTourneesTerminees = eqTournees.filter(t => t.statut === 'Terminée').length;

      let nbCollectes  = 0;
      let volumeTotal  = 0;
      eqTournees.forEach(t => {
        const cols = collecteMap.get(t._id.toString()) ?? [];
        nbCollectes += cols.length;
        volumeTotal += t.volumeTotal ?? 0;
      });

      const tauxCompletion = nbTournees > 0
        ? Math.round((nbTourneesTerminees / nbTournees) * 100)
        : 0;

      const montantPrime =
        nbTourneesTerminees * config.primeParTournee +
        nbCollectes          * config.primeParCollecte;

      // Score = base ranking (entier)
      const score = nbTourneesTerminees * 30 + nbCollectes * 10 + tauxCompletion;

      return {
        equipe,
        nbTournees,
        nbTourneesTerminees,
        nbCollectes,
        volumeTotal: Math.round(volumeTotal * 10) / 10,
        tauxCompletion,
        montantPrime,
        score,
        note: 0,  // calculé après normalisation
        rang: 0,
        badge: null,
      };
    });

    // Trier par score décroissant
    performances.sort((a, b) => b.score - a.score);

    // Normaliser la note /5 par rapport au meilleur score
    const maxScore = performances[0]?.score ?? 0;
    performances.forEach((p, i) => {
      p.rang  = i + 1;
      p.note  = maxScore > 0 ? +(((p.score / maxScore) * 5).toFixed(1)) : 0;
      if (i === 0 && p.score > 0) p.badge = 'Meilleure équipe du mois';
      else if (i === 1 && p.score > 0) p.badge = 'Très performante';
      else if (i === 2 && p.score > 0) p.badge = 'Bonne performance';
      else p.badge = null;
    });

    const tourneesTermineesTotal = tournees.filter(t => t.statut === 'Terminée').length;

    res.json({
      success: true,
      data: {
        mois,
        annee,
        config,
        performances,
        totaux: {
          equipes:              equipes.length,
          tournees:             tournees.length,
          tourneesTerminees:    tourneesTermineesTotal,
          collectes:            collectes.length,
          montantTotal:         performances.reduce((s, p) => s + p.montantPrime, 0),
          volumeTotal:          performances.reduce((s, p) => s + p.volumeTotal, 0),
        },
      },
    });
  } catch (err) { next(err); }
};
