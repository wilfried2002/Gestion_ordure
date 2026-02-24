const mongoose = require('mongoose');

const plainteSchema = new mongoose.Schema({
  citoyenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le citoyen est requis'],
  },
  type: {
    type: String,
    required: [true, 'Le type de plainte est requis'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La description ne doit pas dépasser 1000 caractères'],
  },
  localisation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  statut: {
    type: String,
    enum: ['En attente', 'En cours', 'Résolue'],
    default: 'En attente',
  },
  reponseAdmin: {
    type: String,
    trim: true,
    maxlength: [500, 'La réponse ne doit pas dépasser 500 caractères'],
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
  },
  quartier: {
    type: String,
    trim: true,
  },
  photos: [{
    type: String,
  }],
}, { timestamps: true });

plainteSchema.index({ citoyenId: 1 });
plainteSchema.index({ statut: 1 });

module.exports = mongoose.model('Plainte', plainteSchema);
