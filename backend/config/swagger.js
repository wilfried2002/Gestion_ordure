const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gest_Ordure API',
      version: '1.0.0',
      description: 'API de gestion des collectes d\'ordures ménagères — Ville de Douala',
      contact: {
        name: 'Équipe Gest_Ordure',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Serveur de développement',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT : Bearer <token>',
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentification' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Zones', description: 'Gestion des zones de collecte' },
      { name: 'Quartiers', description: 'Gestion des quartiers' },
      { name: 'Vehicules', description: 'Gestion des véhicules' },
      { name: 'Equipes', description: 'Gestion des équipes' },
      { name: 'Tournees', description: 'Gestion des tournées' },
      { name: 'Collectes', description: 'Enregistrement des collectes' },
      { name: 'Plaintes', description: 'Gestion des plaintes citoyens' },
      { name: 'Incidents', description: 'Gestion des incidents terrain' },
    ],
  },
  apis: ['./routes/*.js'],
};

module.exports = swaggerJSDoc(options);
