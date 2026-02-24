const express = require('express');
const router = express.Router();
const {
  createIncident,
  getIncidents,
  getIncidentById,
  getMesIncidents,
  updateIncident,
  deleteIncident,
} = require('../controllers/incident.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { incidentRules, idParamRule, validate } = require('../utils/validators');

router.post('/', authMiddleware, roleMiddleware(['AGENT', 'ADMIN']), incidentRules, validate, createIncident);
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), getIncidents);
router.get('/mes-incidents', authMiddleware, getMesIncidents);
router.get('/:id', authMiddleware, idParamRule, validate, getIncidentById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'AGENT']), idParamRule, validate, updateIncident);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deleteIncident);

module.exports = router;
