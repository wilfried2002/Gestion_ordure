const mongoose = require('mongoose');
const User     = require('../models/User');
const Vehicule = require('../models/Vehicule');
const Zone     = require('../models/Zone');
const Tournee  = require('../models/Tournee');
const Plainte  = require('../models/Plainte');

exports.getDashboardStats = async (req, res, next) => {
  try {
    // Convertir l'ID en ObjectId pour les pipelines d'agrégation
    const adminId = new mongoose.Types.ObjectId(req.user.id);

    const [
      usersByRole,
      vehiculesByStatut,
      zoneCount,
      tourneesByStatut,
      plaintesPendantes,
      tourneesRecentes,
      plaintesRecentes,
    ] = await Promise.all([
      // Utilisateurs créés par cet admin, groupés par rôle
      User.aggregate([
        { $match: { createdBy: adminId } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      // Véhicules créés par cet admin, groupés par statut
      Vehicule.aggregate([
        { $match: { createdBy: adminId } },
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),
      // Nombre de zones créées par cet admin
      Zone.countDocuments({ createdBy: req.user.id }),
      // Tournées créées par cet admin, groupées par statut
      Tournee.aggregate([
        { $match: { createdBy: adminId } },
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),
      // Plaintes en attente (toutes : les citoyens les soumettent indépendamment)
      Plainte.countDocuments({ statut: { $ne: 'Résolue' } }),
      // Tournées récentes de cet admin
      Tournee.find({ createdBy: req.user.id })
        .sort({ date: -1 }).limit(6)
        .populate('zoneId', 'nom').populate('equipeId', 'nom').lean(),
      // Plaintes récentes (toutes)
      Plainte.find().sort({ createdAt: -1 }).limit(5)
        .populate('citoyenId', 'name').lean(),
    ]);

    const users = { total: 0, ADMIN: 0, AGENT: 0, CITOYEN: 0 };
    usersByRole.forEach(({ _id, count }) => { if (_id) users[_id] = count; users.total += count; });

    const vehicules = { total: 0, Disponible: 0, 'En service': 0, 'En maintenance': 0, 'Hors service': 0 };
    vehiculesByStatut.forEach(({ _id, count }) => { if (_id) vehicules[_id] = count; vehicules.total += count; });

    const tournees = { total: 0, Planifiée: 0, 'En cours': 0, Terminée: 0, Annulée: 0 };
    tourneesByStatut.forEach(({ _id, count }) => { if (_id) tournees[_id] = count; tournees.total += count; });

    res.json({
      success: true,
      data: { users, vehicules, zones: zoneCount, tournees, plaintesPendantes, tourneesRecentes, plaintesRecentes },
    });
  } catch (error) {
    next(error);
  }
};
