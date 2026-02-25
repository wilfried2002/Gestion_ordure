const mongoose = require('mongoose');

const vehiculeSchema = new mongoose.Schema({
  immatriculation: {
    type: String,
    required: [true, "L'immatriculation est requise"],
    unique: true,
    trim: true,
    uppercase: true,
  },
  capacite: {
    type: Number,
    required: [true, 'La capacité est requise'],
    min: [1, 'La capacité doit être supérieure à 0'],
  },
  statut: {
    type: String,
    enum: ['Disponible', 'En tournée', 'En panne'],
    default: 'Disponible',
  },
  localisationGPS: {
    lat: { type: Number },
    lng: { type: Number },
  },
  kilometrage: {
    type: Number,
    default: 0,
    min: [0, 'Le kilométrage ne peut pas être négatif'],
  },
  derniereMaintenance: {
    type: Date,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

vehiculeSchema.index({ statut: 1 });

module.exports = mongoose.model('Vehicule', vehiculeSchema);
