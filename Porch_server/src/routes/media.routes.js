/**
 * Media & Upload Routes for Porch Light Server
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { upload, UPLOAD_ROOT, FILE_SIZE_LIMITS, CATEGORIES } = require('../middleware/upload');
const { isCloudinaryConfigured, generateUploadSignature } = require('../config/cloudinary');
const config = require('../config/env');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/media/sign-upload
 * Returns cryptographic signature for direct Cloudinary uploads
 */
router.post('/sign-upload', requireAuth, (req, res, next) => {
  try {
    const { category = 'property' } = req.body;
    if (!isCloudinaryConfigured()) {
      return res.status(200).json({
        success: true,
        data: {
          configured: false,
          message: 'Cloudinary not configured on this server. Standard upload endpoint will be used.',
        },
      });
    }

    const folder = `porchlight/${category}`;
    const signatureData = generateUploadSignature({ folder });

    res.json({
      success: true,
      data: {
        configured: true,
        ...signatureData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/media/upload
 * Standard secure upload endpoint (handles avatar, property photos, chat attachments, 360 tour)
 */
router.post('/upload', requireAuth, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'No file was uploaded.' },
      });
    }

    const category = req.body.category || 'chat';
    const limit = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.chat;

    if (req.file.size > limit) {
      // Remove oversized file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File exceeds maximum allowed size for ${category} (${Math.round(limit / (1024 * 1024))} MB).`,
        },
      });
    }

    const publicUrl = `/api/media/file/${category}/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: publicUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        category,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/media/file/:category/:filename
 * Secure static media streaming with defensive HTTP headers
 */
router.get('/file/:category/:filename', (req, res) => {
  const { category, filename } = req.params;

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid category' } });
  }

  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  let filePath = path.join(UPLOAD_ROOT, category, safeFilename);

  // Fallback search across all categories in case category field ordering routed upload elsewhere
  if (!fs.existsSync(filePath)) {
    for (const cat of CATEGORIES) {
      const candidate = path.join(UPLOAD_ROOT, cat, safeFilename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Requested media asset was not found.' },
    });
  }

  // Security headers: allow images to render in browser elements
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Disposition', 'inline');

  res.sendFile(filePath);
});

module.exports = router;

