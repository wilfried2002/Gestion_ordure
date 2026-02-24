const express = require('express');
const router = express.Router();
const { createVehicule, getVehicules, getVehiculeById, updateVehicule, deleteVehicule } = require('../controllers/vehicule.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { vehiculeRules, idParamRule, validate } = require('../utils/validators');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), vehiculeRules, validate, createVehicule);
router.get('/', authMiddleware, getVehicules);
router.get('/:id', authMiddleware, idParamRule, validate, getVehiculeById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), [...idParamRule, ...vehiculeRules], validate, updateVehicule);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteVehicule);

module.exports = router;
