const express = require('express');
const router  = express.Router();
const {
  createTournee, getTournees, getTourneeById, updateTournee, deleteTournee,
  getMesTournees, demarrerTournee, terminerTournee,
} = require('../controllers/tournee.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { tourneeRules, idParamRule, validate } = require('../utils/validators');

// Agent – routes spécifiques (avant les routes génériques)
router.get('/agent/mes-tournees', authMiddleware, roleMiddleware(['AGENT']), getMesTournees);
router.put('/:id/demarrer',       authMiddleware, roleMiddleware(['AGENT']), idParamRule, validate, demarrerTournee);
router.put('/:id/terminer',       authMiddleware, roleMiddleware(['AGENT']), idParamRule, validate, terminerTournee);

// Admin CRUD
router.post('/',    authMiddleware, roleMiddleware(['ADMIN']), tourneeRules, validate, createTournee);
router.get('/',     authMiddleware, getTournees);
router.get('/:id',  authMiddleware, idParamRule, validate, getTourneeById);
router.put('/:id',  authMiddleware, roleMiddleware(['ADMIN', 'AGENT']), idParamRule, validate, updateTournee);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteTournee);

module.exports = router;
