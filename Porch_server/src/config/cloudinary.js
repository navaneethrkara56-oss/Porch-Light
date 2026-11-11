/**
 * Cloudinary Storage Readiness Configuration & Signed Upload Helper
 *
 * ARCHITECTURAL BOUNDARY:
 * - Direct unsigned uploads from the browser are strictly prohibited to prevent asset tampering.
 * - The Cloudinary API Secret is strictly SERVER-ONLY and must never be provided to frontend builds or responses.
 * - In later implementation phases, when an authenticated Agent uploads listing photos (up to 5 photos, max 5MB each)
 *   or 360° virtual tour assets, the server generates a cryptographically signed upload signature:
 *     POST /api/media/sign-upload -> returns { timestamp, signature, apiKey, cloudName, folder }
 * - The frontend uploads directly to Cloudinary's secure upload API using this temporary signature.
 */

const crypto = require('crypto');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * Check if Cloudinary credentials are fully configured on the server
 */
function isCloudinaryConfigured() {
  return Boolean(
    config.cloudinary.cloudName &&
    config.cloudinary.apiKey &&
    config.cloudinary.apiSecret
  );
}

/**
 * Generate a secure server-side upload signature (Preparation for later media uploads)
 * @param {Object} paramsToSign - Key-value parameters to include in signature (e.g. folder, timestamp, public_id)
 * @returns {Object} - { signature, timestamp, apiKey, cloudName, folder }
 */
function generateUploadSignature(paramsToSign = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured on this server.');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    ...paramsToSign,
    timestamp,
  };

  // Sort parameter keys alphabetically as required by Cloudinary signing algorithm
  const serialized = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  const stringToSign = `${serialized}${config.cloudinary.apiSecret}`;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  return {
    signature,
    timestamp,
    apiKey: config.cloudinary.apiKey,
    cloudName: config.cloudinary.cloudName,
    folder: paramsToSign.folder || 'porchlight/properties',
  };
}

module.exports = {
  isCloudinaryConfigured,
  generateUploadSignature,
};

