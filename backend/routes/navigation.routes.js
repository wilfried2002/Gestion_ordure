/**
 * navigation.routes.js
 * Routes API pour l'optimisation d'itinéraires et la navigation GPS.
 */
'use strict';

const express = require('express');
const router  = express.Router();
const {
  calculerItineraire,
  prochainBac,
  mettreAJourPosition,
} = require('../controllers/navigation.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

// POST /api/navigation/itineraire — ADMIN ou AGENT
router.post('/itineraire', authMiddleware, calculerItineraire);

// POST /api/navigation/prochain-bac — AGENT uniquement
router.post('/prochain-bac', authMiddleware, roleMiddleware(['AGENT']), prochainBac);

// POST /api/navigation/position — AGENT uniquement (tracking GPS)
router.post('/position', authMiddleware, roleMiddleware(['AGENT']), mettreAJourPosition);

module.exports = router;
