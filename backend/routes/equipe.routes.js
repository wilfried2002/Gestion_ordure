const express = require('express');
const router = express.Router();
const {
  createEquipe, getEquipes, getEquipeById, updateEquipe, deleteEquipe,
  addMembre, removeMembre,
} = require('../controllers/equipe.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { equipeRules, idParamRule, validate } = require('../utils/validators');

router.post('/', authMiddleware, roleMiddleware(['ADMIN']), equipeRules, validate, createEquipe);
router.get('/', authMiddleware, getEquipes);
router.get('/:id', authMiddleware, idParamRule, validate, getEquipeById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, updateEquipe);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteEquipe);

// Gestion des membres
router.post('/:id/membres',            authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, addMembre);
router.delete('/:id/membres/:userId',  authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, removeMembre);

module.exports = router;
