const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Flux d'écriture vers le fichier access.log (mode append)
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Format personnalisé : méthode, URL, statut, durée, IP, date
morgan.token('host', (req) => req.hostname);
morgan.token('body', (req) => {
  // Masquer le mot de passe dans les logs
  if (req.body && req.body.password) {
    return JSON.stringify({ ...req.body, password: '****' });
  }
  return JSON.stringify(req.body || {});
});

const logFormat =
  ':remote-addr [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" - :response-time ms';

// Logger console (développement) : coloré et lisible
const devLogger = morgan('dev');

// Logger fichier (production) : format complet
const fileLogger = morgan(logFormat, { stream: accessLogStream });

// Middleware combiné
const logger = (req, res, next) => {
  devLogger(req, res, (err) => {
    if (err) return next(err);
    fileLogger(req, res, next);
  });
};

module.exports = logger;
