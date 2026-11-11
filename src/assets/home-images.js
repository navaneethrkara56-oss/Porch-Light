/**
 * HOME_IMAGES Asset Slots & Slot Resolution System
 *
 * Fallback Chain:
 * 1. Local file in /public/home/<slot>.jpg (or .webp)
 * 2. Curated stock URL
 * 3. Generated local SVG placeholder (porcelain-to-sand tinted tile with line drawing of house/room & slot name)
 */

export const STOCK_SLOTS = {
  // Hero section
  'hero.bg': '/hero/hero-bg.jpg',
  'hero.house': '/hero/hero-house.png',

  // Section 2: Platform Intro top strip
  'intro.carousel1': '/home/intro.carousel1.jpg',
  'intro.carousel2': '/home/intro.carousel2.jpg',
  'intro.carousel3': '/home/intro.carousel3.jpg',
  'intro.carousel4': '/home/intro.carousel4.jpg',
  'intro.carousel5': '/home/intro.carousel5.jpg',

  // Section 2: Platform Intro main block
  'intro.gallery1': '/home/intro.gallery1.jpg',
  'intro.gallery2': '/home/intro.gallery2.jpg',
  'intro.gallery3': '/home/intro.gallery3.jpg',

  // Top properties
  'top.1': '/home/top.1.jpg',
  'top.2': '/home/top.2.jpg',
  'top.3': '/home/top.3.jpg',
  'top.4': '/home/top.4.jpg',

  // Later sections
  'paths.exterior': '/home/paths.exterior.jpg',
  'features.1': '/home/features.1.jpg',
  'features.2': '/home/features.2.jpg',
  'features.3': '/home/features.3.jpg',
  'features.4': '/home/features.4.jpg',
  'features.5': '/home/features.5.jpg',
  'reviews.interior': '/home/reviews.interior.jpg',
  'journal.1': '/home/journal.1.jpg',
  'journal.2': '/home/journal.2.jpg',
  'journal.3': '/home/journal.3.jpg',
  'agent.desk': '/home/agent.desk.jpg',
};

// Remote stock URLs as secondary fallback
export const REMOTE_STOCK_SLOTS = {
  'hero.bg': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2560&q=85',
  'hero.house': '/hero/hero-house.png',
  'intro.carousel1': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  'intro.carousel2': 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
  'intro.carousel3': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  'intro.carousel4': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'intro.carousel5': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  'intro.gallery1': 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80',
  'intro.gallery2': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  'intro.gallery3': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
  'top.1': 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=80',
  'top.2': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1400&q=80',
  'top.3': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
  'top.4': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=80',
  'paths.exterior': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=85',
  'features.1': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'features.2': 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  'features.3': 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80',
  'features.4': 'https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1200&q=80',
  'features.5': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
  'reviews.interior': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80',
  'journal.1': 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1000&q=80',
  'journal.2': 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1000&q=80',
  'journal.3': 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80',
  'agent.desk': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
};

/**
 * Fallback SVG generator:
 * Porcelain-to-sand tinted tile with a thin line drawing of a house/room and the slot name in small mono text.
 */
export function getTintPlaceholder(label = 'Porch Light') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="tileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F1ECE3"/>
        <stop offset="100%" stop-color="#E7DFD2"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#tileGrad)"/>
    <g stroke="#8F7FA8" stroke-width="1.5" fill="none" opacity="0.65">
      <!-- Minimalist line drawing of house with pitched roof and doorway -->
      <polygon points="400,180 520,270 520,410 280,410 280,270"/>
      <line x1="260" y1="270" x2="400" y2="165"/>
      <line x1="400" y1="165" x2="540" y2="270"/>
      <rect x="365" y="320" width="70" height="90" rx="4"/>
      <circle cx="420" cy="365" r="3" fill="#8F7FA8"/>
      <rect x="310" y="300" width="35" height="40" rx="2"/>
      <rect x="455" y="300" width="35" height="40" rx="2"/>
    </g>
    <text x="50%" y="465" dominant-baseline="middle" text-anchor="middle" font-family="'Space Mono', monospace" font-size="13" font-weight="bold" fill="#26262B" letter-spacing="1.5">${label}</text>
    <text x="50%" y="490" dominant-baseline="middle" text-anchor="middle" font-family="'Space Mono', monospace" font-size="10" fill="#5E4F7A" letter-spacing="2">PORCH LIGHT VERIFIED</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const localAvailabilityCache = new Map();

/**
 * Checks if a local override file exists.
 * Fallback chain: local file -> stock URL -> SVG placeholder
 */
export async function getSlotUrl(slot) {
  if (localAvailabilityCache.has(slot)) {
    return localAvailabilityCache.get(slot);
  }

  const localPaths = [];
  if (slot === 'hero.bg') {
    localPaths.push('/hero/hero-bg.jpg', '/home/hero.bg.jpg');
  } else if (slot === 'hero.house') {
    localPaths.push('/hero/hero-house.png', '/home/hero.house.png');
  } else {
    localPaths.push(`/home/${slot}.jpg`, `/home/${slot}.webp`, `/home/${slot}.png`);
  }

  for (const path of localPaths) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (response.ok) {
        localAvailabilityCache.set(slot, path);
        return path;
      }
    } catch {
      // Continue to next path
    }
  }

  const fallback = REMOTE_STOCK_SLOTS[slot] || getTintPlaceholder(slot);
  localAvailabilityCache.set(slot, fallback);
  return fallback;
}

export function getInitialSlotUrl(slot) {
  return STOCK_SLOTS[slot] || REMOTE_STOCK_SLOTS[slot] || getTintPlaceholder(slot);
}
