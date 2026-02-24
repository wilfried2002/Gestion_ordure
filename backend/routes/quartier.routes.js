const express = require('express');
const router = express.Router();
const { createQuartier, getQuartiers, getQuartierById, updateQuartier, deleteQuartier } = require('../controllers/quartier.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { quartierRules, idParamRule, validate } = require('../utils/validators');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), quartierRules, validate, createQuartier);
router.get('/', authMiddleware, getQuartiers);
router.get('/:id', authMiddleware, idParamRule, validate, getQuartierById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), [...idParamRule, ...quartierRules], validate, updateQuartier);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteQuartier);

module.exports = router;
