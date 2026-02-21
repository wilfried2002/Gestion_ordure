const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById } = require('../controllers/user.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, roleMiddleware(['ADMIN']), getAllUsers);
router.get('/:id', authMiddleware, getUserById);

module.exports = router;
