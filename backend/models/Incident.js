const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tourneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournee' },
  description: { type: String },
  statut: { type: String, enum: ['Ouvert','En cours','Résolu'], default: 'Ouvert' }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
