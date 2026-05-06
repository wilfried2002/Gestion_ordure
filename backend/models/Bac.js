const mongoose = require('mongoose');

const bacSchema = new mongoose.Schema({
  codeBac: {
    type:     String,
    required: [true, 'Le code du bac est requis'],
    uppercase: true,
    trim:     true,
  },

  latitude:  { type: Number, required: true, min: -90,  max: 90  },
  longitude: { type: Number, required: true, min: -180, max: 180 },

  zoneId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Zone',
    required: [true, 'La zone est requise'],
  },

  capacite:          { type: Number, default: 1000, min: 1 }, // litres
  niveauRemplissage: { type: Number, default: 0, min: 0, max: 100 },

  statut: {
    type:    String,
    enum:    ['Vide', 'Moyen', 'Plein'],
    default: 'Vide',
  },

  derniereCollecte: { type: Date, default: null },

  createdBy: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
}, { timestamps: true });

// ── Mise à jour automatique du statut selon le niveau ──────────────────────
bacSchema.pre('save', async function () {
  if      (this.niveauRemplissage >= 80) this.statut = 'Plein';
  else if (this.niveauRemplissage >= 40) this.statut = 'Moyen';
  else                                   this.statut = 'Vide';
});

// ── Indexes ────────────────────────────────────────────────────────────────
bacSchema.index({ zoneId: 1, statut: 1 });
bacSchema.index({ statut: 1 });
bacSchema.index({ createdBy: 1 });
bacSchema.index({ codeBac: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Bac', bacSchema);
