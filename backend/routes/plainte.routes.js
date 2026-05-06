const express = require('express');
const router  = express.Router();
const {
  createPlainte,
  getPlaintes,
  getPlainteById,
  getMesPlaintes,
  updatePlainte,
  deletePlainte,
} = require('../controllers/plainte.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const { idParamRule, validate }          = require('../utils/validators');
const upload                             = require('../middlewares/upload.middleware');

// POST avec multer (multipart/form-data) – jusqu'à 3 photos
router.post('/', authMiddleware, upload.array('photos', 3), createPlainte);
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), getPlaintes);
router.get('/mes-plaintes', authMiddleware, getMesPlaintes);
router.get('/:id', authMiddleware, idParamRule, validate, getPlainteById);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, updatePlainte);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), idParamRule, validate, deletePlainte);

module.exports = router;
