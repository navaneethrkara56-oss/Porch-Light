import imageCompression from 'browser-image-compression';

export const IMAGE_LIMITS = {
  MIN_PHOTOS: 1,
  MAX_PHOTOS: 5,
  MAX_FLOOR_PLANS: 2,
  MAX_PANORAMAS: 1,
  MAX_FILE_SIZE_MB: 5,
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!IMAGE_LIMITS.ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Format must be JPG, PNG, or WebP' };
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > IMAGE_LIMITS.MAX_FILE_SIZE_MB) {
    return { valid: false, error: `File size exceeds ${IMAGE_LIMITS.MAX_FILE_SIZE_MB}MB limit` };
  }

  return { valid: true };
}

export async function compressListingImage(file) {
  const options = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.82,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.warn('Compression fallback to original file', error);
    return file;
  }
}

export async function compressProfileImage(file) {
  const options = {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.warn('Profile image compression fallback to original', error);
    return file;
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Validates that a remote image URL is well-formed and can actually be loaded
 */
export function validateRemoteImageUrl(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      resolve({ valid: false, error: 'Please enter a valid image URL.' });
      return;
    }

    const trimmed = url.trim();
    try {
      new URL(trimmed);
    } catch {
      resolve({ valid: false, error: 'Malformed URL format. Must start with http:// or https://' });
      return;
    }

    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve({ valid: false, error: 'Image request timed out. Please verify the URL is publicly reachable.' });
    }, 8000);

    img.onload = () => {
      clearTimeout(timer);
      resolve({ valid: true, width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve({
        valid: false,
        error: 'Could not load image from this URL. Please verify the URL links directly to an accessible image.',
      });
    };

    img.src = trimmed;
  });
}

/**
 * Validates a 360° panorama asset for PhotoSphereViewer
 */
export function validatePanoramaAsset(urlOrDataUrl) {
  return new Promise((resolve) => {
    if (!urlOrDataUrl || typeof urlOrDataUrl !== 'string') {
      resolve({ valid: false, error: 'Please provide a 360° panorama asset URL or file.' });
      return;
    }

    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve({ valid: false, error: 'Panorama request timed out.' });
    }, 10000);

    img.onload = () => {
      clearTimeout(timer);
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio < 1.4 || ratio > 2.6) {
        resolve({
          valid: true,
          warning: `Aspect ratio is ${ratio.toFixed(2)}:1. Equirectangular 2:1 (e.g. 4096×2048) renders best in 3D.`,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } else {
        resolve({
          valid: true,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve({
        valid: false,
        error: 'Failed to load panorama image. Please ensure the asset is a valid, publicly accessible image.',
      });
    };

    img.src = urlOrDataUrl;
  });
}


