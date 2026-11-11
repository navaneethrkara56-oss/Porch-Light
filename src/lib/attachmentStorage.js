/**
 * attachmentStorage.js
 *
 * IndexedDB storage for chat file and image attachments.
 * Ensures binary file data is kept OUT of localStorage while remaining accessible
 * for previews and downloads across page sessions.
 */

const DB_NAME = 'porchlight_chat_attachments';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const ALLOWED_EXTENSIONS_LABEL = 'JPG, PNG, WebP, or PDF (up to 5MB)';

/**
 * Validates a file against allowed types and maximum size limits.
 */
export function validateAttachment(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Maximum allowed size is 5 MB.`,
    };
  }

  // Normalize mime type check (some systems might give empty or uppercase)
  const mimeType = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasAllowedExt =
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.pdf');

  if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType) && !hasAllowedExt) {
    return {
      valid: false,
      error: 'Unsupported file type. Please attach a JPG, PNG, WebP image or PDF document.',
    };
  }

  return { valid: true };
}

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (e) => {
      console.warn('IndexedDB error opening attachment store:', e);
      resolve(null);
    };
  });

  return dbPromise;
}

/**
 * Saves a file or Blob in IndexedDB under the specified ID.
 */
export async function saveAttachmentBlob(id, fileBlob) {
  try {
    const db = await openDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileBlob, id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to save blob to IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieves a file or Blob by ID from IndexedDB.
 */
export async function getAttachmentBlob(id) {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get blob from IndexedDB:', err);
    return null;
  }
}

/**
 * Deletes an attachment Blob from IndexedDB.
 */
export async function deleteAttachmentBlob(id) {
  try {
    const db = await openDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}
