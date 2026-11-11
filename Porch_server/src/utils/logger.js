/**
 * Porch Light Server Logger
 * Clean, restrained logging that sanitizes secrets, tokens, and credentials.
 */

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'mongouri',
  'mongodb_uri',
  'cloudinary_api_secret',
  'google_client_secret',
];

function sanitize(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const logger = {
  info: (msg, meta) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[${timestamp}] [INFO] ${msg}`, sanitize(meta));
    } else {
      console.log(`[${timestamp}] [INFO] ${msg}`);
    }
  },
  warn: (msg, meta) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[${timestamp}] [WARN] ${msg}`, sanitize(meta));
    } else {
      console.warn(`[${timestamp}] [WARN] ${msg}`);
    }
  },
  error: (msg, err) => {
    const timestamp = new Date().toISOString();
    const safeError = err instanceof Error
      ? { message: err.message, name: err.name }
      : sanitize(err);
    console.error(`[${timestamp}] [ERROR] ${msg}`, safeError);
  },
};

module.exports = logger;

