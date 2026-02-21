const mongoose = require('mongoose');

const tourneeSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  equipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipe', required: true },
  quartiers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quartier' }],
  statut: { type: String, enum: ['Planifiée','En cours','Terminée'], default: 'Planifiée' },
  volumeTotal: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Tournee', tourneeSchema);
