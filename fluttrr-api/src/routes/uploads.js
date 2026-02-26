const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { uploadToCloud, isConfigured: cloudConfigured } = require('../utils/storage');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many uploads, please try again later' },
});

// ─── Multer config ─────────────────────────────────────
// Cloud mode: memory storage (buffer) → upload to R2
// Local mode: disk storage → serve from /uploads
const storage = cloudConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
      },
    });

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── Helpers ───────────────────────────────────────────

function extFromMime(mimetype) {
  const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
  return map[mimetype] || '.jpg';
}

async function processFile(req, file) {
  if (cloudConfigured) {
    const key = `images/${uuidv4()}${extFromMime(file.mimetype)}`;
    const url = await uploadToCloud(file.buffer, key, file.mimetype);
    return { url, filename: key, size: file.size, mimetype: file.mimetype };
  }

  // Local fallback
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    url: `${baseUrl}/uploads/${file.filename}`,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
  };
}

// ─── POST / — Upload single file ───────────────────────

router.post('/', requireAuth, uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await processFile(req, req.file);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /multiple — Upload multiple files ────────────

router.post('/multiple', requireAuth, uploadLimiter, upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = await Promise.all(req.files.map((file) => processFile(req, file)));
    res.status(201).json({ files });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
