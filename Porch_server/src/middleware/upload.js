/**
 * Upload Security Policy & Middleware for Porch Light Server
 *
 * Centralized Rules:
 * - Avatar: JPG, PNG, WebP only. Max 2MB.
 * - Property: JPG, PNG, WebP only. Max 5MB. Max 5 photos per property.
 * - Chat: JPG, PNG, WebP, PDF only. Max 5MB.
 * - 360 Tour: JPG, PNG, WebP only (Equirectangular 2:1). Max 15MB. Verified Premium required.
 *
 * Executables (.exe, .sh, .bat), scripts (.js, .html, .svg), and archives are rejected.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

// Ensure destination directories exist
const CATEGORIES = ['avatar', 'property', 'chat', 'tour360'];
CATEGORIES.forEach((cat) => {
  const dir = path.join(UPLOAD_ROOT, cat);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALLOWED_MIME_TYPES = {
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  property: ['image/jpeg', 'image/png', 'image/webp'],
  chat: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  tour360: ['image/jpeg', 'image/png', 'image/webp'],
};

const FILE_SIZE_LIMITS = {
  avatar: 2 * 1024 * 1024, // 2MB
  property: 5 * 1024 * 1024, // 5MB
  chat: 5 * 1024 * 1024, // 5MB
  tour360: 15 * 1024 * 1024, // 15MB
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const category = req.body.category || req.query?.category || req.headers['x-category'] || 'chat';
    const safeCategory = CATEGORIES.includes(category) ? category : 'chat';
    const dest = path.join(UPLOAD_ROOT, safeCategory);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const category = req.body.category || 'chat';
  const allowed = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.chat;

  if (!allowed.includes(file.mimetype)) {
    const err = new Error(
      `Unsupported file format (${file.mimetype}). Allowed formats for ${category}: ${allowed.join(', ')}`
    );
    err.code = 'UNSUPPORTED_FILE_TYPE';
    err.statusCode = 400;
    return cb(err, false);
  }

  // Double check file extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const safeExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (!safeExts.includes(ext)) {
    const err = new Error(`Unsafe file extension (${ext}). Executables and scripts are rejected.`);
    err.code = 'UNSAFE_EXTENSION';
    err.statusCode = 400;
    return cb(err, false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // Maximum ceiling checked per category in controller
  },
});

module.exports = {
  upload,
  UPLOAD_ROOT,
  CATEGORIES,
  FILE_SIZE_LIMITS,
};

