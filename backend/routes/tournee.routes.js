const express = require('express');
const router = express.Router();
const { createTournee, getTournees } = require('../controllers/tournee.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), createTournee);
router.get('/', authMiddleware, getTournees);

module.exports = router;
