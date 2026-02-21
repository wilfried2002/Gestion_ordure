const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Zone', zoneSchema);
