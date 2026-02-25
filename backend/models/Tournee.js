const mongoose = require('mongoose');

const tourneeSchema = new mongoose.Schema({
  date: { type: Date, required: [true, 'La date est requise'] },
  equipeId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Equipe',
    required: [true, "L'équipe est requise"],
  },
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  vehiculeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicule' },
  quartiers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quartier' }],
  statut: {
    type: String,
    enum: ['Planifiée', 'En cours', 'Terminée', 'Annulée'],
    default: 'Planifiée',
  },
  volumeTotal: { type: Number, default: 0, min: 0 },
  heureDebut: { type: String },
  heureFin:   { type: String },
  heureDebutReel: { type: Date },
  heureFinReel:   { type: Date },
  notes:     { type: String, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

tourneeSchema.index({ date: 1 });
tourneeSchema.index({ statut: 1 });
tourneeSchema.index({ equipeId: 1 });

module.exports = mongoose.model('Tournee', tourneeSchema);
