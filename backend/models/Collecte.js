const mongoose = require('mongoose');

const collecteSchema = new mongoose.Schema({
  tourneeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tournee',  required: true },
  quartierId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Quartier', required: true },
  agentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  volume:      { type: Number, default: 0, min: 0 },
  statut:      { type: String, enum: ['Planifié', 'En cours', 'Collecté'], default: 'Planifié' },
  commentaire: { type: String, maxlength: 500 },
  valideeLe:   { type: Date },
  heure:       { type: Date, default: Date.now },
}, { timestamps: true });

collecteSchema.index({ tourneeId: 1 });
collecteSchema.index({ statut: 1 });

module.exports = mongoose.model('Collecte', collecteSchema);
