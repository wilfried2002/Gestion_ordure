const Incident = require('../models/Incident');
const { AppError } = require('../middlewares/error.middleware');

exports.createIncident = async (req, res, next) => {
  try {
    const incident = await Incident.create({
      ...req.body,
      agentId: req.user.id,
    });
    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

exports.getIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find()
      .populate('agentId', 'name email')
      .populate('tourneeId', 'date statut')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    next(error);
  }
};

exports.getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('agentId', 'name email')
      .populate('tourneeId', 'date statut quartiers')
      .lean();
    if (!incident) return next(new AppError('Incident non trouvé', 404));
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

// Incidents signalés par l'agent connecté
exports.getMesIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({ agentId: req.user.id })
      .populate('tourneeId', 'date statut')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    next(error);
  }
};

exports.updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('agentId', 'name email')
      .populate('tourneeId', 'date statut')
      .lean();
    if (!incident) return next(new AppError('Incident non trouvé', 404));
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

exports.deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return next(new AppError('Incident non trouvé', 404));
    res.json({ success: true, message: 'Incident supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};
