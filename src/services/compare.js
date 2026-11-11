/**
 * compare.js
 *
 * Dedicated comparison service managing separate compare selections for Buy ('sale')
 * and Rent ('rent'). Max 3 properties per category. Synchronized across Listings,
 * Map, Property View, and Compare Page with reactive subscriptions.
 */

const STORAGE_KEY = 'porchlight_compare_state';

// State shape: { sale: [], rent: [] }
let state = loadInitialState();
const listeners = new Set();

function loadInitialState() {
  if (typeof window === 'undefined') {
    return { sale: [], rent: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sale: [], rent: [] };
    const parsed = JSON.parse(raw);
    return {
      sale: Array.isArray(parsed.sale) ? parsed.sale.slice(0, 3) : [],
      rent: Array.isArray(parsed.rent) ? parsed.rent.slice(0, 3) : [],
    };
  } catch (e) {
    return { sale: [], rent: [] };
  }
}

function persistState() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore quota errors
  }
  notify();
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener({ ...state });
    } catch (e) {
      console.warn('Error in compare subscriber:', e);
    }
  });
}

/**
 * Normalizes listing type to 'sale' or 'rent'
 */
export function normalizeType(type) {
  if (!type) return 'sale';
  const clean = String(type).toLowerCase().trim();
  return clean === 'rent' || clean === 'rental' ? 'rent' : 'sale';
}

/**
 * Get compare list for a specific listing type ('sale' or 'rent')
 */
export function getCompareList(listingType = 'sale') {
  const type = normalizeType(listingType);
  return state[type] || [];
}

export const getComparedProperties = getCompareList;

/**
 * Check if a property is in the compare list
 */
export function isCompared(propertyId, listingType) {
  if (!propertyId) return false;
  if (listingType) {
    const type = normalizeType(listingType);
    return (state[type] || []).some((p) => p.id === propertyId);
  }
  return (
    (state.sale || []).some((p) => p.id === propertyId) ||
    (state.rent || []).some((p) => p.id === propertyId)
  );
}

/**
 * Add property to comparison list without toggling off if already present
 */
export function addCompare(property, preferredType) {
  if (!property || !property.id) return { success: false, action: 'error', message: 'Invalid property' };
  const type = normalizeType(preferredType || property.listingType);
  const currentList = state[type] || [];
  const exists = currentList.some((p) => p.id === property.id);

  if (exists) {
    return { success: true, action: 'already_added', message: 'Already in comparison', list: currentList };
  }

  // Check limit (max 3)
  if (currentList.length >= 3) {
    return {
      success: false,
      action: 'limit_reached',
      message: `Comparison allows a maximum of 3 ${type === 'rent' ? 'rental' : 'sale'} properties. Please remove an item first.`,
      list: currentList,
    };
  }

  // Add
  state[type] = [...currentList, property];
  persistState();
  return { success: true, action: 'added', list: state[type] };
}

/**
 * Toggle property in comparison list
 */
export function toggleCompare(property, preferredType) {
  if (!property || !property.id) return { success: false, action: 'error', message: 'Invalid property' };
  const type = normalizeType(preferredType || property.listingType);
  const currentList = state[type] || [];
  const existsIndex = currentList.findIndex((p) => p.id === property.id);

  if (existsIndex >= 0) {
    // Remove
    state[type] = currentList.filter((p) => p.id !== property.id);
    persistState();
    return { success: true, action: 'removed', list: state[type] };
  }

  // Check limit (max 3)
  if (currentList.length >= 3) {
    return {
      success: false,
      action: 'limit_reached',
      message: `Comparison allows a maximum of 3 ${type === 'rent' ? 'rental' : 'sale'} properties. Please remove an item first.`,
      list: currentList,
    };
  }

  // Add
  state[type] = [...currentList, property];
  persistState();
  return { success: true, action: 'added', list: state[type] };
}

/**
 * Remove property from comparison
 */
export function removeCompare(propertyId, listingType) {
  if (!propertyId) return;
  const typesToCheck = listingType ? [normalizeType(listingType)] : ['sale', 'rent'];

  let changed = false;
  typesToCheck.forEach((type) => {
    const initialLen = (state[type] || []).length;
    state[type] = (state[type] || []).filter((p) => p.id !== propertyId);
    if (state[type].length !== initialLen) changed = true;
  });

  if (changed) {
    persistState();
  }
}

/**
 * Clear comparison list for a specific category
 */
export function clearCompare(listingType) {
  const type = normalizeType(listingType);
  state[type] = [];
  persistState();
}

/**
 * Add from Property View:
 * Adds the property as the first item in that listing type's compare selection,
 * preserving any compatible existing selections (up to 3 total).
 * If selection already has 3 items and this property is not in it, does not replace.
 */
export function addFromPropertyView(property) {
  if (!property || !property.id) return { success: false, reason: 'invalid', message: 'Invalid property' };
  const type = normalizeType(property.listingType);
  const currentList = state[type] || [];
  const exists = currentList.some((p) => p.id === property.id);

  if (exists) {
    // Move to front if already in list
    const filtered = currentList.filter((p) => p.id !== property.id);
    state[type] = [property, ...filtered];
    persistState();
    return { success: true, action: 'already_present', list: state[type] };
  }

  if (currentList.length >= 3) {
    return {
      success: false,
      reason: 'limit_reached',
      message: `Comparison limit of 3 ${type === 'rent' ? 'rental' : 'sale'} properties reached. Remove an item from the compare tray first.`,
      list: currentList,
    };
  }

  // Add as first item, preserving existing selections
  state[type] = [property, ...currentList];
  persistState();
  return { success: true, action: 'added', list: state[type] };
}

/**
 * Subscribe to compare state changes
 * Can subscribe to full state: subscribeToCompare((fullState) => ...)
 * or to a specific mode: subscribeToCompare('sale', (saleList) => ...)
 */
export function subscribeToCompare(listingTypeOrCallback, maybeCallback) {
  let type = null;
  let cb = null;
  if (typeof listingTypeOrCallback === 'function') {
    cb = listingTypeOrCallback;
  } else {
    type = normalizeType(listingTypeOrCallback);
    cb = maybeCallback;
  }

  if (typeof cb !== 'function') return () => {};

  const handler = (fullState) => {
    if (type) {
      cb(fullState[type] || []);
    } else {
      cb(fullState);
    }
  };

  listeners.add(handler);
  // initial call
  if (type) {
    cb(state[type] || []);
  } else {
    cb({ ...state });
  }

  return () => {
    listeners.delete(handler);
  };
}

export function getCompareState() {
  return { ...state };
}

export const addToCompare = addCompare;
export const isInCompare = isCompared;
export const removeFromCompare = removeCompare;
