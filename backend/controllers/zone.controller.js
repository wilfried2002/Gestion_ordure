const Zone            = require('../models/Zone');
const User            = require('../models/User');
const { AppError }    = require('../middlewares/error.middleware');
const adminScope      = require('../utils/scopeFilter');
const ARRONDISSEMENTS = require('../data/arrondissements');

/* ─── CRUD de base ───────────────────────────────────────────────────────── */

exports.createZone = async (req, res, next) => {
  try {
    const zone = await Zone.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: zone });
  } catch (error) { next(error); }
};

exports.getZones = async (req, res, next) => {
  try {
    // ADMIN → uniquement ses zones | AGENT/CITOYEN → toutes (données de référence)
    const zones = await Zone.find(adminScope(req));
    res.json({ success: true, count: zones.length, data: zones });
  } catch (error) { next(error); }
};

exports.getZoneById = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({ _id: req.params.id, ...adminScope(req) });
    if (!zone) return next(new AppError('Zone non trouvée', 404));
    res.json({ success: true, data: zone });
  } catch (error) { next(error); }
};

exports.updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!zone) return next(new AppError('Zone non trouvée ou accès refusé', 404));
    res.json({ success: true, data: zone });
  } catch (error) { next(error); }
};

exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!zone) return next(new AppError('Zone non trouvée ou accès refusé', 404));
    res.json({ success: true, message: 'Zone supprimée avec succès' });
  } catch (error) { next(error); }
};

/* ─── Arrondissements : liste pour la ville de l'admin connecté ─────────── */

exports.getArrondissements = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id).select('ville').lean();
    const ville = admin?.ville ?? 'Douala';
    const liste = ARRONDISSEMENTS[ville] ?? [];

    // Indiquer quels arrondissements ont déjà une zone associée
    const existingNoms = new Set(
      (await Zone.find({ createdBy: req.user.id }).select('nom').lean()).map(z => z.nom)
    );

    const data = liste.map(arr => ({
      ...arr,
      exists: existingNoms.has(arr.nom),
    }));

    res.json({ success: true, ville, total: liste.length, data });
  } catch (error) { next(error); }
};

/* ─── Génération automatique : créer toutes les zones de la ville ────────── */

exports.bulkCreateZones = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id).select('ville').lean();
    const ville = admin?.ville ?? 'Douala';
    const liste = ARRONDISSEMENTS[ville] ?? [];

    if (liste.length === 0) {
      return next(new AppError(`Aucun arrondissement défini pour "${ville}"`, 400));
    }

    // Ne créer que les zones manquantes
    const existingNoms = new Set(
      (await Zone.find({ createdBy: req.user.id }).select('nom').lean()).map(z => z.nom)
    );

    const toCreate = liste
      .filter(arr => !existingNoms.has(arr.nom))
      .map(arr => ({
        nom:         arr.nom,
        description: `Zone de collecte – ${arr.nom}, quartier ${arr.quartier ?? ville}`,
        createdBy:   req.user.id,
      }));

    if (toCreate.length === 0) {
      return res.json({
        success: true,
        message: `Toutes les zones de ${ville} existent déjà.`,
        created: 0,
        data:    [],
      });
    }

    const created = await Zone.insertMany(toCreate, { ordered: false });
    res.status(201).json({
      success: true,
      message: `${created.length} zone(s) créée(s) pour ${ville}.`,
      created: created.length,
      data:    created,
    });
  } catch (error) { next(error); }
};
