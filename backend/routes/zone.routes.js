const express = require('express');
const router = express.Router();
const { createZone, getZones, getZoneById, updateZone, deleteZone } = require('../controllers/zone.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { zoneRules, idParamRule, validate } = require('../utils/validators');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), zoneRules, validate, createZone);
router.get('/', authMiddleware, getZones);
router.get('/:id', authMiddleware, idParamRule, validate, getZoneById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), [...idParamRule, ...zoneRules], validate, updateZone);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteZone);

module.exports = router;
