/**
 * Middleware centralisé de gestion des erreurs
 * Doit être enregistré en DERNIER dans server.js
 */

// Classe personnalisée pour les erreurs applicatives
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Gestionnaire d'erreurs Mongoose : ID invalide
const handleCastError = (err) => {
  const message = `Ressource introuvable. ID invalide : ${err.value}`;
  return new AppError(message, 400);
};

// Gestionnaire d'erreurs Mongoose : champ unique dupliqué
const handleDuplicateFields = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `La valeur "${value}" est déjà utilisée pour le champ "${field}". Veuillez en choisir une autre.`;
  return new AppError(message, 400);
};

// Gestionnaire d'erreurs Mongoose : validation échouée
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Données invalides : ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Gestionnaire JWT : token invalide
const handleJWTError = () =>
  new AppError('Token invalide. Veuillez vous reconnecter.', 401);

// Gestionnaire JWT : token expiré
const handleJWTExpiredError = () =>
  new AppError('Votre session a expiré. Veuillez vous reconnecter.', 401);

// Réponse en développement : détails complets
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

// Réponse en production : message minimal
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    console.error('ERREUR CRITIQUE :', err);
    res.status(500).json({
      success: false,
      message: 'Une erreur interne est survenue.',
    });
  }
};

// Middleware principal (4 arguments obligatoires pour Express)
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message };

    if (err.name === 'CastError') error = handleCastError(error);
    if (err.code === 11000) error = handleDuplicateFields(error);
    if (err.name === 'ValidationError') error = handleValidationError(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// Middleware pour les routes non trouvées (404)
const notFound = (req, res, next) => {
  next(new AppError(`Route introuvable : ${req.originalUrl}`, 404));
};

module.exports = { errorHandler, notFound, AppError };
