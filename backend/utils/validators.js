const { body, param, validationResult } = require('express-validator');

/**
 * Middleware qui vérifie les résultats de validation
 * et renvoie les erreurs s'il y en a.
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── AUTH ──────────────────────────────────────────────────────────────────────

exports.registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email')
    .trim()
    .notEmpty().withMessage("L'email est requis")
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'AGENT', 'CITOYEN']).withMessage('Rôle invalide'),
];

exports.loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage("L'email est requis")
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis'),
];

// ─── ZONE ──────────────────────────────────────────────────────────────────────

exports.zoneRules = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom de la zone est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La description ne doit pas dépasser 500 caractères'),
];

// ─── QUARTIER ──────────────────────────────────────────────────────────────────

exports.quartierRules = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom du quartier est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('zoneId')
    .notEmpty().withMessage('La zone est requise')
    .isMongoId().withMessage('ID de zone invalide'),
];

// ─── VEHICULE ──────────────────────────────────────────────────────────────────

exports.vehiculeRules = [
  body('immatriculation')
    .trim()
    .notEmpty().withMessage("L'immatriculation est requise")
    .isLength({ min: 3, max: 20 }).withMessage("L'immatriculation doit contenir entre 3 et 20 caractères"),
  body('capacite')
    .notEmpty().withMessage('La capacité est requise')
    .isFloat({ min: 1 }).withMessage('La capacité doit être un nombre positif'),
  body('statut')
    .optional()
    .isIn(['Disponible', 'En tournée', 'En panne']).withMessage('Statut invalide'),
  body('localisationGPS.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('localisationGPS.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
];

// ─── ÉQUIPE ────────────────────────────────────────────────────────────────────

exports.equipeRules = [
  body('nom')
    .trim()
    .notEmpty().withMessage("Le nom de l'équipe est requis")
    .isLength({ min: 2, max: 80 }).withMessage('Le nom doit contenir entre 2 et 80 caractères'),
  body('vehiculeId')
    .optional()
    .isMongoId().withMessage('ID de véhicule invalide'),
  body('membres')
    .optional()
    .isArray().withMessage('Les membres doivent être un tableau'),
  body('membres.*')
    .optional()
    .isMongoId().withMessage('ID de membre invalide'),
];

// ─── TOURNÉE ───────────────────────────────────────────────────────────────────

exports.tourneeRules = [
  body('date')
    .notEmpty().withMessage('La date est requise')
    .isISO8601().withMessage('Format de date invalide (ISO 8601 attendu)'),
  body('equipeId')
    .notEmpty().withMessage("L'équipe est requise")
    .isMongoId().withMessage('ID équipe invalide'),
  body('quartiers')
    .optional()
    .isArray().withMessage('Les quartiers doivent être un tableau'),
  body('quartiers.*')
    .optional()
    .isMongoId().withMessage('ID de quartier invalide'),
  body('statut')
    .optional()
    .isIn(['Planifiée', 'En cours', 'Terminée']).withMessage('Statut invalide'),
];

// ─── COLLECTE ──────────────────────────────────────────────────────────────────

exports.collecteRules = [
  body('tourneeId')
    .notEmpty().withMessage('La tournée est requise')
    .isMongoId().withMessage('ID tournée invalide'),
  body('quartierId')
    .notEmpty().withMessage('Le quartier est requis')
    .isMongoId().withMessage('ID quartier invalide'),
  body('volume')
    .notEmpty().withMessage('Le volume est requis')
    .isFloat({ min: 0 }).withMessage('Le volume doit être un nombre positif'),
];

// ─── PLAINTE ───────────────────────────────────────────────────────────────────

exports.plainteRules = [
  body('type')
    .trim()
    .notEmpty().withMessage('Le type de plainte est requis'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La description ne doit pas dépasser 1000 caractères'),
  body('localisation.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('localisation.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
];

// ─── INCIDENT ──────────────────────────────────────────────────────────────────

exports.incidentRules = [
  body('description')
    .trim()
    .notEmpty().withMessage('La description est requise')
    .isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caractères'),
  body('tourneeId')
    .optional()
    .isMongoId().withMessage('ID tournée invalide'),
  body('statut')
    .optional()
    .isIn(['Ouvert', 'En cours', 'Résolu']).withMessage('Statut invalide'),
  body('gravite')
    .optional()
    .isIn(['Faible', 'Modérée', 'Élevée']).withMessage('Gravité invalide'),
];

// ─── PARAM ID ──────────────────────────────────────────────────────────────────

exports.idParamRule = [
  param('id').isMongoId().withMessage('ID invalide'),
];
