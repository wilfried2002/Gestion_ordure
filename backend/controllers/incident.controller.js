const Incident = require('../models/Incident');
const User     = require('../models/User');
const { AppError } = require('../middlewares/error.middleware');

exports.createIncident = async (req, res, next) => {
  try {
    const incident = await Incident.create({ ...req.body, agentId: req.user.id });
    res.status(201).json({ success: true, data: incident });
  } catch (error) { next(error); }
};

// ADMIN : voir uniquement les incidents des agents qu'il a créés
exports.getIncidents = async (req, res, next) => {
  try {
    const myAgents = await User.find({ createdBy: req.user.id }).select('_id').lean();
    const agentIds = myAgents.map(a => a._id);

    const incidents = await Incident.find({ agentId: { $in: agentIds } })
      .populate('agentId', 'name email')
      .populate('tourneeId', 'date statut')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) { next(error); }
};

exports.getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('agentId', 'name email')
      .populate('tourneeId', 'date statut quartiers')
      .lean();
    if (!incident) return next(new AppError('Incident non trouvé', 404));

    // ADMIN : vérifier que l'agent appartient à cet admin
    if (req.user.role === 'ADMIN') {
      const agent = await User.findOne({ _id: incident.agentId, createdBy: req.user.id });
      if (!agent) return next(new AppError('Accès refusé', 403));
    }
    // AGENT : vérifier que c'est son propre incident
    if (req.user.role === 'AGENT' && incident.agentId?._id?.toString() !== req.user.id) {
      return next(new AppError('Accès refusé', 403));
    }

    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};

// Agent : voir uniquement ses propres incidents
exports.getMesIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({ agentId: req.user.id })
      .populate('tourneeId', 'date statut')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) { next(error); }
};

exports.updateIncident = async (req, res, next) => {
  try {
    let filter = { _id: req.params.id };
    // AGENT : ne peut modifier que ses propres incidents
    if (req.user.role === 'AGENT') filter.agentId = req.user.id;

    const incident = await Incident.findOneAndUpdate(filter, req.body, {
      new: true, runValidators: true,
    })
      .populate('agentId', 'name email')
      .populate('tourneeId', 'date statut')
      .lean();
    if (!incident) return next(new AppError('Incident non trouvé ou accès refusé', 404));
    res.json({ success: true, data: incident });
  } catch (error) { next(error); }
};

// ADMIN : supprimer uniquement les incidents des agents qu'il a créés
exports.deleteIncident = async (req, res, next) => {
  try {
    const myAgents = await User.find({ createdBy: req.user.id }).select('_id').lean();
    const agentIds = myAgents.map(a => a._id);
    const incident = await Incident.findOneAndDelete({ _id: req.params.id, agentId: { $in: agentIds } });
    if (!incident) return next(new AppError('Incident non trouvé ou accès refusé', 404));
    res.json({ success: true, message: 'Incident supprimé avec succès' });
  } catch (error) { next(error); }
};
