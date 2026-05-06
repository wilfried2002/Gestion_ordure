const mongoose = require('mongoose');

/**
 * Enregistre chaque décaissement de prime effectué par un admin vers une équipe.
 * Sert de preuve de traçabilité.
 */
const decaissementSchema = new mongoose.Schema({
  equipeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Equipe', required: true },
  mois:        { type: Number, required: true, min: 1, max: 12 },
  annee:       { type: Number, required: true },
  montant:     { type: Number, required: true, min: 0 },
  statut:      { type: String, enum: ['En attente', 'Décaissé', 'Annulé'], default: 'En attente' },
  note:        { type: String, maxlength: 500 },
  decaisseLe:  { type: Date },
  decaissePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

decaissementSchema.index({ equipeId: 1, mois: 1, annee: 1 });
decaissementSchema.index({ statut: 1 });

module.exports = mongoose.model('Decaissement', decaissementSchema);
