const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const { registerRules, loginRules, validate } = require('../utils/validators');

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);

module.exports = router;
