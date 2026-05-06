const mongoose = require('mongoose');
const User     = require('../models/User');
const Vehicule = require('../models/Vehicule');
const Zone     = require('../models/Zone');
const Tournee  = require('../models/Tournee');
const Plainte  = require('../models/Plainte');
const Collecte = require('../models/Collecte');

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

// ── Analytics pour les graphiques ─────────────────────────────────────────

exports.getAnalytics = async (req, res, next) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.user.id);

    // Période : 30 derniers jours pour le graphique journalier
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [
      agentsPerf,
      vehiculesUtil,
      collectesStatut,
      collectesParJour,
      signalParZone,
    ] = await Promise.all([

      // 1) Performance agents : nb collectes + volume par agent
      Collecte.aggregate([
        { $match: { statut: 'Collecté' } },
        { $lookup: { from: 'tournees', localField: 'tourneeId', foreignField: '_id', as: 't' } },
        { $unwind: '$t' },
        { $match: { 't.createdBy': adminId } },
        { $group: {
          _id: '$agentId',
          nbCollectes:  { $sum: 1 },
          volumeTotal:  { $sum: '$volume' },
        }},
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
        { $unwind: { path: '$agent', preserveNullAndEmpty: true } },
        { $project: {
          agentName:   { $ifNull: ['$agent.name', 'Inconnu'] },
          nbCollectes: 1,
          volumeTotal: { $round: ['$volumeTotal', 1] },
        }},
        { $sort: { nbCollectes: -1 } },
        { $limit: 10 },
      ]),

      // 2) Utilisation des véhicules : nb tournées par camion
      Tournee.aggregate([
        { $match: { createdBy: adminId, vehiculeId: { $ne: null } } },
        { $group: { _id: '$vehiculeId', nbTournees: { $sum: 1 } } },
        { $lookup: { from: 'vehicules', localField: '_id', foreignField: '_id', as: 'v' } },
        { $unwind: { path: '$v', preserveNullAndEmpty: true } },
        { $project: {
          immatriculation: { $ifNull: ['$v.immatriculation', 'N/A'] },
          nbTournees: 1,
        }},
        { $sort: { nbTournees: -1 } },
      ]),

      // 3) Statut des collectes (pour cet admin)
      Collecte.aggregate([
        { $lookup: { from: 'tournees', localField: 'tourneeId', foreignField: '_id', as: 't' } },
        { $unwind: '$t' },
        { $match: { 't.createdBy': adminId } },
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),

      // 4) Collectes par jour (30 derniers jours)
      Collecte.aggregate([
        { $lookup: { from: 'tournees', localField: 'tourneeId', foreignField: '_id', as: 't' } },
        { $unwind: '$t' },
        { $match: { 't.createdBy': adminId, createdAt: { $gte: since30 } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // 5) Signalements citoyens par zone
      Plainte.aggregate([
        { $match: { zoneId: { $ne: null } } },
        { $group: { _id: '$zoneId', nbSignalements: { $sum: 1 } } },
        { $lookup: { from: 'zones', localField: '_id', foreignField: '_id', as: 'zone' } },
        { $unwind: { path: '$zone', preserveNullAndEmpty: true } },
        { $project: {
          zoneNom: { $ifNull: ['$zone.nom', 'Zone inconnue'] },
          nbSignalements: 1,
        }},
        { $sort: { nbSignalements: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Formater statut collectes en objet
    const statutMap = { 'Collecté': 0, 'En cours': 0, 'Planifié': 0 };
    collectesStatut.forEach(({ _id, count }) => { if (_id) statutMap[_id] = count; });

    res.json({
      success: true,
      data: {
        agentsPerformance:   agentsPerf,
        vehiculesUtilisation: vehiculesUtil,
        collectesStatut:     statutMap,
        collectesParJour:    collectesParJour.map(d => ({ date: d._id, count: d.count })),
        signalParZone:       signalParZone,
      },
    });
  } catch (error) { next(error); }
};
