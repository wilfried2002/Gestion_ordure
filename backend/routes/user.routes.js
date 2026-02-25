const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/user.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { idParamRule, validate } = require('../utils/validators');

router.get('/',    authMiddleware, roleMiddleware(['ADMIN']), getAllUsers);
router.post('/',   authMiddleware, roleMiddleware(['ADMIN']), createUser);
router.get('/:id', authMiddleware, idParamRule, validate, getUserById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, updateUser);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteUser);

module.exports = router;
