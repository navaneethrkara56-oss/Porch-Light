/**
 * Canonical Cities Source of Truth for Porch Light Server
 * Exactly 10 canonical operating cities with coordinate anchors and alias resolution.
 */

const CANONICAL_CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Kozhikode',
  'Bengaluru',
  'Kochi',
  'Thiruvananthapuram',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Goa',
];

const CITY_ALIASES = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  calicut: 'Kozhikode',
  kozhikode: 'Kozhikode',
  trivandrum: 'Thiruvananthapuram',
  thiruvananthapuram: 'Thiruvananthapuram',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  kochi: 'Kochi',
  cochin: 'Kochi',
  chennai: 'Chennai',
  madras: 'Chennai',
  hyderabad: 'Hyderabad',
  pune: 'Pune',
  goa: 'Goa',
  delhi: 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  'new delhi': 'Delhi NCR',
  ncr: 'Delhi NCR',
};

const CITY_COORDINATES = {
  'Delhi NCR': { lat: 28.6139, lng: 77.2090, state: 'Delhi', defaultPin: '110001' },
  Mumbai: { lat: 19.0760, lng: 72.8777, state: 'Maharashtra', defaultPin: '400001' },
  Kozhikode: { lat: 11.2588, lng: 75.7804, state: 'Kerala', defaultPin: '673001' },
  Bengaluru: { lat: 12.9716, lng: 77.5946, state: 'Karnataka', defaultPin: '560001' },
  Kochi: { lat: 9.9312, lng: 76.2673, state: 'Kerala', defaultPin: '682001' },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366, state: 'Kerala', defaultPin: '695001' },
  Chennai: { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', defaultPin: '600001' },
  Hyderabad: { lat: 17.3850, lng: 78.4867, state: 'Telangana', defaultPin: '500001' },
  Pune: { lat: 18.5204, lng: 73.8567, state: 'Maharashtra', defaultPin: '411001' },
  Goa: { lat: 15.2993, lng: 74.1240, state: 'Goa', defaultPin: '403001' },
};

/**
 * Normalizes input string to canonical city name if matched, else returns original trimmed string.
 * @param {string} cityInput
 * @returns {string}
 */
function normalizeCity(cityInput) {
  if (!cityInput || typeof cityInput !== 'string') return '';
  const cleaned = cityInput.trim().toLowerCase();
  if (CITY_ALIASES[cleaned]) {
    return CITY_ALIASES[cleaned];
  }
  if (cleaned.includes('delhi') || cleaned === 'ncr') {
    return 'Delhi NCR';
  }
  const match = CANONICAL_CITIES.find((c) => c.toLowerCase() === cleaned);
  return match || cityInput.trim();
}

module.exports = {
  CANONICAL_CITIES,
  CITY_ALIASES,
  CITY_COORDINATES,
  normalizeCity,
};

