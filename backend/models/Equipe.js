const mongoose = require('mongoose');

const equipeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  membres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  vehiculeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicule' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Equipe', equipeSchema);
