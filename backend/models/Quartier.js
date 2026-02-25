const mongoose = require('mongoose');

const quartierSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  zoneId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Quartier', quartierSchema);
