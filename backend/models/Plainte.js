const mongoose = require('mongoose');

const plainteSchema = new mongoose.Schema({
  citoyenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  description: { type: String },
  localisation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  statut: { type: String, enum: ['En attente','En cours','Résolue'], default: 'En attente' }
}, { timestamps: true });

module.exports = mongoose.model('Plainte', plainteSchema);
