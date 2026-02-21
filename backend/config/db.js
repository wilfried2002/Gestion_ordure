const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/gest_ordure_douala');
    console.log('✅ MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB', error);
    process.exit(1);
  }
};

module.exports = connectDB;
