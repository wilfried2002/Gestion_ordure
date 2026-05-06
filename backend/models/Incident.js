const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "L'agent est requis"],
  },
  tourneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournee',
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    minlength: [10, 'La description doit contenir au moins 10 caractères'],
  },
  statut: {
    type: String,
    enum: ['Ouvert', 'En cours', 'Résolu'],
    default: 'Ouvert',
  },
  gravite: {
    type: String,
    enum: ['Faible', 'Modérée', 'Élevée'],
    default: 'Faible',
  },
  photos: [{
    type: String,
  }],
}, { timestamps: true });

incidentSchema.index({ agentId: 1, createdAt: -1 }); // requête principale : mes incidents triés
incidentSchema.index({ statut: 1 });
incidentSchema.index({ gravite: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
