const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  nom:         { type: String, required: true },
  description: { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

// Unicité du nom par admin (deux admins peuvent avoir une zone "Zone Nord")
zoneSchema.index({ nom: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Zone', zoneSchema);
