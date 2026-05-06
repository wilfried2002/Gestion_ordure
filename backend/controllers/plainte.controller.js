const Plainte = require('../models/Plainte');
const { AppError } = require('../middlewares/error.middleware');

exports.createPlainte = async (req, res, next) => {
  try {
    // ── Vérification anti-ancienne photo ──────────────────────────────────
    // Si des photos sont jointes, le champ capturedAt doit être présent
    // et dater de moins de 5 minutes (photo prise en temps réel uniquement).
    if (req.files && req.files.length > 0) {
      const { capturedAt } = req.body;
      if (!capturedAt) {
        return next(new AppError('Le champ capturedAt est requis pour les photos.', 400));
      }
      const captureMs = new Date(capturedAt).getTime();
      if (isNaN(captureMs)) {
        return next(new AppError('Format de capturedAt invalide.', 400));
      }
      const diffMinutes = (Date.now() - captureMs) / 60_000;
      if (diffMinutes > 5 || diffMinutes < -1) {
        return next(new AppError(
          'La photo doit être prise en temps réel (moins de 5 minutes). Veuillez reprendre une nouvelle photo.',
          400
        ));
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Chemins des photos uploadées par Multer (max 3)
    const photos = (req.files ?? []).map(f => `/uploads/plaintes/${f.filename}`);

    const plainte = await Plainte.create({
      ...req.body,
      citoyenId: req.user.id,
      photos,
    });

    // Notification temps-réel → tous les admins connectés
    const io = req.app.get('io');
    if (io) {
      io.emit('nouvelle-plainte', {
        _id:       plainte._id,
        type:      plainte.type,
        statut:    plainte.statut,
        createdAt: plainte.createdAt,
      });
    }

    res.status(201).json({ success: true, data: plainte });
  } catch (error) {
    next(error);
  }
};

exports.getPlaintes = async (req, res, next) => {
  try {
    const plaintes = await Plainte.find()
      .populate('citoyenId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: plaintes.length, data: plaintes });
  } catch (error) {
    next(error);
  }
};

exports.getPlainteById = async (req, res, next) => {
  try {
    const plainte = await Plainte.findById(req.params.id)
      .populate('citoyenId', 'name email')
      .populate('zoneId', 'nom arrondissement')
      .lean();
    if (!plainte) return next(new AppError('Plainte non trouvée', 404));
    res.json({ success: true, data: plainte });
  } catch (error) {
    next(error);
  }
};

// Citoyen : voir uniquement ses propres plaintes
exports.getMesPlaintes = async (req, res, next) => {
  try {
    const plaintes = await Plainte.find({ citoyenId: req.user.id })
      .populate('zoneId', 'nom arrondissement')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: plaintes.length, data: plaintes });
  } catch (error) {
    next(error);
  }
};

exports.updatePlainte = async (req, res, next) => {
  try {
    const plainte = await Plainte.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('citoyenId', 'name email').lean();
    if (!plainte) return next(new AppError('Plainte non trouvée', 404));
    res.json({ success: true, data: plainte });
  } catch (error) {
    next(error);
  }
};

exports.deletePlainte = async (req, res, next) => {
  try {
    const plainte = await Plainte.findByIdAndDelete(req.params.id);
    if (!plainte) return next(new AppError('Plainte non trouvée', 404));
    res.json({ success: true, message: 'Plainte supprimée avec succès' });
  } catch (error) {
    next(error);
  }
};
