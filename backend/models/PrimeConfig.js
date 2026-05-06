const mongoose = require('mongoose');

/**
 * Configuration des taux de primes (un document par admin).
 * Montants en FCFA.
 */
const primeConfigSchema = new mongoose.Schema({
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  primeParTournee:  { type: Number, default: 5000, min: 0 },  // prime par tournée complète
  primeParCollecte: { type: Number, default: 500,  min: 0 },  // prime par collecte effectuée
}, { timestamps: true });

module.exports = mongoose.model('PrimeConfig', primeConfigSchema);
