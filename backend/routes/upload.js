const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');

// Crear directorio de uploads si no existe
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'));
    }
  }
});

router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('[UPLOAD] No image file provided');
    return res.status(400).json({ message: 'No image provided' });
  }
  // URL absoluta para acceso desde el frontend
  const imageUrl = `http://localhost:4000/uploads/${req.file.filename}`;
  console.log('[UPLOAD] Success:', imageUrl, 'File size:', req.file.size);
  res.json({ imageUrl, filename: req.file.filename });
});

module.exports = router;
