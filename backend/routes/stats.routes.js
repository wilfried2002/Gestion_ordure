const express = require('express');
const router  = express.Router();
const { getDashboardStats } = require('../controllers/stats.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.get('/dashboard', authMiddleware, roleMiddleware(['ADMIN']), getDashboardStats);

module.exports = router;
