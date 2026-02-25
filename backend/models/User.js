const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
    maxlength: [50, 'Le nom ne doit pas dépasser 50 caractères'],
  },
  email: {
    type: String,
    required: [true, "L'email est requis"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalide'],
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
  },
  role: {
    type: String,
    enum: ['ADMIN', 'AGENT', 'CITOYEN'],
    default: 'CITOYEN',
  },
  quartier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quartier',
  },
  telephone: {
    type: String,
    trim: true,
  },
  ville: {
    type: String,
    trim: true,
    default: 'Douala',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

// email déjà indexé via unique:true dans le schéma
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
