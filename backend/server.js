const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

connectDB(); // 🔥 connexion à MongoDB

app.use(cors());
app.use(express.json());

// ✅ IMPORT DES ROUTES
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const zoneRoutes = require('./routes/zone.routes');
const quartierRoutes = require('./routes/quartier.routes');
const vehiculeRoutes = require('./routes/vehicule.routes');
const tourneeRoutes = require('./routes/tournee.routes');
const plainteRoutes = require('./routes/plainte.routes');

// ✅ UTILISATION DES ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/quartiers', quartierRoutes);
app.use('/api/vehicules', vehiculeRoutes);
app.use('/api/tournees', tourneeRoutes);
app.use('/api/plaintes', plainteRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));

const User = require('./models/User');

app.get('/api/test', async (req, res) => {
  const user = await User.create({ name: 'Wilfried', email: 'wilfried@test.com', password: '123456' });
  res.json({ message: 'User créé et base gest_ordure_douala active', user });
});