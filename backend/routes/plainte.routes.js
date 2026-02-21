const express = require('express');
const router = express.Router();
const { createPlainte, getPlaintes } = require('../controllers/plainte.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, createPlainte);
router.get('/', authMiddleware, getPlaintes);

module.exports = router;
