const express = require('express');
const router  = express.Router();
const {
  getBacs,
  getBacById,
  createBac,
  updateBac,
  deleteBac,
  updateNiveau,
  optimiserTournee,
  getStatsBacs,
} = require('../controllers/bac.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

const adminOnly = roleMiddleware(['ADMIN']);

// ── Statistiques & optimisation (avant /:id pour éviter les conflits) ──────
router.get( '/stats',              authMiddleware, adminOnly, getStatsBacs);
router.post('/tournee-optimisee',  authMiddleware, adminOnly, optimiserTournee);

// ── CRUD ────────────────────────────────────────────────────────────────────
router.get( '/',     authMiddleware, getBacs);
router.post('/',     authMiddleware, adminOnly, createBac);
router.get( '/:id',  authMiddleware, getBacById);
router.put( '/:id',  authMiddleware, adminOnly, updateBac);
router.delete('/:id',authMiddleware, adminOnly, deleteBac);

// ── Mise à jour du niveau de remplissage ───────────────────────────────────
router.patch('/:id/niveau', authMiddleware, adminOnly, updateNiveau);

module.exports = router;
