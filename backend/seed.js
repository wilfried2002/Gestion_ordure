require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Zone = require('./models/Zone');
const Quartier = require('./models/Quartier');
const Vehicule = require('./models/Vehicule');
const Equipe = require('./models/Equipe');

connectDB();

const seed = async () => {
  try {
    // ❌ Supprime les anciennes données
    await User.deleteMany();
    await Zone.deleteMany();
    await Quartier.deleteMany();
    await Vehicule.deleteMany();
    await Equipe.deleteMany();

    // 🔹 Créer un admin
    const admin = await User.create({
      name: 'Admin Douala',
      email: 'admin@douala.cm',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN'
    });

    // 🔹 Créer quelques zones
    const zone1 = await Zone.create({ nom: 'Zone Centre', description: 'Centre-ville' });
    const zone2 = await Zone.create({ nom: 'Zone Nord', description: 'Quartiers du nord' });

    // 🔹 Créer quelques quartiers
    const quartier1 = await Quartier.create({ nom: 'Bonanjo', zoneId: zone1._id });
    const quartier2 = await Quartier.create({ nom: 'Akwa', zoneId: zone1._id });
    const quartier3 = await Quartier.create({ nom: 'Makepe', zoneId: zone2._id });

    // 🔹 Créer des véhicules
    const vehicule1 = await Vehicule.create({ immatriculation: 'MND-001', capacite: 1000 });
    const vehicule2 = await Vehicule.create({ immatriculation: 'MND-002', capacite: 800 });

    // 🔹 Créer une équipe
    const equipe1 = await Equipe.create({
      nom: 'Equipe 1',
      membres: [],
      vehiculeId: vehicule1._id
    });

    console.log('✅ Seed terminé avec succès');
    process.exit();
  } catch (err) {
    console.error('❌ Erreur seed:', err);
    process.exit(1);
  }
};

seed();
