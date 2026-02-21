const mongoose = require('mongoose');

const vehiculeSchema = new mongoose.Schema({
  immatriculation: { type: String, required: true, unique: true },
  capacite: { type: Number, required: true },
  statut: { type: String, enum: ['Disponible', 'En tournée', 'En panne'], default: 'Disponible' },
  localisationGPS: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, { timestamps: true });

module.exports = mongoose.model('Vehicule', vehiculeSchema);
