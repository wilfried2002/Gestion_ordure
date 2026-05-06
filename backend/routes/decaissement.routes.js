const express = require('express');
const router  = express.Router();
const {
  create, getAll, updateStatut, getForAgent,
} = require('../controllers/decaissement.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

const adminOnly = roleMiddleware(['ADMIN']);
const agentOrAdmin = roleMiddleware(['ADMIN', 'AGENT']);

// ── Admin ──────────────────────────────────────────────────────────────────
router.post('/',           authMiddleware, adminOnly,     create);
router.get('/',            authMiddleware, adminOnly,     getAll);
router.put('/:id/statut',  authMiddleware, adminOnly,     updateStatut);

// ── Agent : décaissements de son équipe ────────────────────────────────────
router.get('/mes-primes',  authMiddleware, agentOrAdmin,  getForAgent);

module.exports = router;
