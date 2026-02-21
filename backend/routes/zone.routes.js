const express = require('express');
const router = express.Router();
const { createZone, getZones } = require('../controllers/zone.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), createZone);
router.get('/', authMiddleware, getZones);

module.exports = router;
