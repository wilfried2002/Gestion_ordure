const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'plaintes');

// Crée le dossier s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase())
          && allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error('Seules les images (jpg, png, webp) sont acceptées.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max par image
});

module.exports = upload;
