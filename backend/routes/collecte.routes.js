const express = require('express');
const router  = express.Router();
const {
  createCollecte, getCollectes, getCollecteById,
  getCollectesByTournee, updateCollecte, validerPoint, deleteCollecte,
} = require('../controllers/collecte.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { collecteRules, idParamRule, validate } = require('../utils/validators');

router.post('/',                       authMiddleware, roleMiddleware(['ADMIN', 'AGENT']), collecteRules, validate, createCollecte);
router.get('/',                        authMiddleware, roleMiddleware(['ADMIN']), getCollectes);
router.get('/tournee/:tourneeId',      authMiddleware, getCollectesByTournee);
router.get('/:id',                     authMiddleware, idParamRule, validate, getCollecteById);
router.put('/:id/valider',             authMiddleware, roleMiddleware(['AGENT', 'ADMIN']), idParamRule, validate, validerPoint);
router.put('/:id',                     authMiddleware, roleMiddleware(['ADMIN', 'AGENT']), idParamRule, validate, updateCollecte);
router.delete('/:id',                  authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteCollecte);

module.exports = router;
