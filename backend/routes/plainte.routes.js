const express = require('express');
const router = express.Router();
const {
  createPlainte,
  getPlaintes,
  getPlainteById,
  getMesPlaintes,
  updatePlainte,
  deletePlainte,
} = require('../controllers/plainte.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { plainteRules, idParamRule, validate } = require('../utils/validators');

router.post('/', authMiddleware, plainteRules, validate, createPlainte);
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), getPlaintes);
router.get('/mes-plaintes', authMiddleware, getMesPlaintes);
router.get('/:id', authMiddleware, idParamRule, validate, getPlainteById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, updatePlainte);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deletePlainte);

module.exports = router;
