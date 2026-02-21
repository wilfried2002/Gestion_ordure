const mongoose = require('mongoose');

const collecteSchema = new mongoose.Schema({
  tourneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournee', required: true },
  quartierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quartier', required: true },
  volume: { type: Number, required: true },
  heure: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Collecte', collecteSchema);
