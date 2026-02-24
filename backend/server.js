const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const logger = require('./middlewares/logger.middleware');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();

// ─── CONNEXION BASE DE DONNÉES ─────────────────────────────────────────────────
connectDB();

// ─── SÉCURITÉ : Headers HTTP ───────────────────────────────────────────────────
app.use(helmet());

// ─── SÉCURITÉ : Rate limiting ──────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Trop de requêtes. Veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);
app.use('/api/auth', authLimiter);

// ─── MIDDLEWARES DE BASE ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── SÉCURITÉ : Injection NoSQL ────────────────────────────────────────────────
// Fix Express 5: req.query is read-only, sanitize body/params only
app.use((req, res, next) => {
  if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// ─── LOGGER ────────────────────────────────────────────────────────────────────
app.use(logger);

// ─── DOCUMENTATION SWAGGER ─────────────────────────────────────────────────────
app.use('/api/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
  customSiteTitle: 'Gest_Ordure API Docs',
}));

// ─── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/users',     require('./routes/user.routes'));
app.use('/api/zones',     require('./routes/zone.routes'));
app.use('/api/quartiers', require('./routes/quartier.routes'));
app.use('/api/vehicules', require('./routes/vehicule.routes'));
app.use('/api/equipes',   require('./routes/equipe.routes'));
app.use('/api/tournees',  require('./routes/tournee.routes'));
app.use('/api/collectes', require('./routes/collecte.routes'));
app.use('/api/plaintes',  require('./routes/plainte.routes'));
app.use('/api/incidents', require('./routes/incident.routes'));

// ─── ROUTE HEALTH CHECK ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Serveur opérationnel', timestamp: new Date() });
});

// ─── ROUTES INEXISTANTES (404) ─────────────────────────────────────────────────
app.use(notFound);

// ─── GESTIONNAIRE D'ERREURS CENTRALISÉ ────────────────────────────────────────
app.use(errorHandler);

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
  console.log(`Documentation API : http://localhost:${PORT}/api/docs`);
  console.log(`Environnement : ${process.env.NODE_ENV || 'development'}`);
});
