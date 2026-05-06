const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/gest_ordure_douala', {
      maxPoolSize:               50,   // pool de 50 connexions réutilisables
      serverSelectionTimeoutMS: 5000, // timeout sélection serveur
      socketTimeoutMS:         45000, // timeout socket
      family:                      4, // force IPv4 – évite la résolution IPv6 lente
    });
    console.log('✅ MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB', error);
    process.exit(1);
  }
};

module.exports = connectDB;
