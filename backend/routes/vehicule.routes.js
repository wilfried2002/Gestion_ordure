const express = require('express');
const router = express.Router();
const { createVehicule, getVehicules } = require('../controllers/vehicule.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), createVehicule);
router.get('/', authMiddleware, getVehicules);

module.exports = router;
