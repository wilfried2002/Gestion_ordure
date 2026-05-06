const express = require('express');
const router  = express.Router();
const { getDashboardStats, getAnalytics } = require('../controllers/stats.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { cache } = require('../middlewares/cache.middleware');

const adminOnly = roleMiddleware(['ADMIN']);

router.get('/dashboard',  authMiddleware, adminOnly, cache(), getDashboardStats);
router.get('/analytics',  authMiddleware, adminOnly, cache(), getAnalytics);

module.exports = router;
