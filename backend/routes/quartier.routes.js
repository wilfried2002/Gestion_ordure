const express = require('express');
const router = express.Router();
const { createQuartier, getQuartiers } = require('../controllers/quartier.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), createQuartier);
router.get('/', authMiddleware, getQuartiers);

module.exports = router;
