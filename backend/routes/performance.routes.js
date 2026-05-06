const express = require('express');
const router  = express.Router();
const {
  getPerformances,
  getConfig,
  updateConfig,
} = require('../controllers/performance.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { cache, invalidate } = require('../middlewares/cache.middleware');

const adminOnly = roleMiddleware(['ADMIN']);

// ── Configuration des primes ─────────────────────────────────────────────
router.get('/config',  authMiddleware, adminOnly, getConfig);
router.put('/config',  authMiddleware, adminOnly, (req, res, next) => {
  // Invalider le cache performances après changement de taux
  invalidate(req.user.id, '/api/performances');
  next();
}, updateConfig);

// ── Performances mensuelles ──────────────────────────────────────────────
router.get('/',        authMiddleware, adminOnly, cache(), getPerformances);

module.exports = router;
