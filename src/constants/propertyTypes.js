/**
 * Canonical Property Classifications for Porch Light
 * Unified single source of truth used across Add Property, Edit Property,
 * listing browse filters, property cards, maps, analytics, and Property View.
 */

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment', category: 'residential' },
  { value: 'villa', label: 'Villa', category: 'residential' },
  { value: 'penthouse', label: 'Penthouse', category: 'residential' },
  { value: 'house', label: 'Independent House', category: 'residential' },
  { value: 'mansion', label: 'Mansion', category: 'residential' },
  { value: 'townhouse', label: 'Townhouse', category: 'residential' },
  { value: 'farmhouse', label: 'Farmhouse', category: 'residential' },
  { value: 'studio', label: 'Studio Apartment', category: 'residential' },
  { value: 'plot', label: 'Plot / Land', category: 'land' },
  { value: 'office', label: 'Commercial Office', category: 'commercial' },
  { value: 'shop', label: 'Retail Shop / Showroom', category: 'commercial' },
  { value: 'commercial', label: 'Commercial Space', category: 'commercial' },
  { value: 'warehouse', label: 'Warehouse / Logistics', category: 'commercial' },
  { value: 'industrial', label: 'Industrial Facility', category: 'commercial' },
];

export const CANONICAL_PROPERTY_TYPE_VALUES = PROPERTY_TYPES.map((t) => t.value);

export const SALE_PROPERTY_TYPES = [
  'villa',
  'apartment',
  'penthouse',
  'house',
  'mansion',
  'townhouse',
  'farmhouse',
  'plot',
  'commercial',
  'office',
  'shop',
  'warehouse',
  'industrial',
];

export const RENT_PROPERTY_TYPES = [
  'apartment',
  'villa',
  'penthouse',
  'studio',
  'house',
  'townhouse',
  'farmhouse',
  'office',
  'shop',
  'commercial',
  'warehouse',
  'industrial',
];

/**
 * Formats a raw property type string into its canonical display label
 */
export function formatPropertyType(type) {
  if (!type) return 'Residence';
  const clean = String(type).trim().toLowerCase();
  const found = PROPERTY_TYPES.find((t) => t.value.toLowerCase() === clean);
  if (found) return found.label;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Canonical floor field behavior mapping for all 14 property classifications.
 * Determines whether unit floor level and/or total floors apply and should be validated.
 */
export function getFloorFieldConfig(type) {
  const clean = String(type || '').trim().toLowerCase();

  // Land / Plot: no building structure
  if (clean === 'plot') {
    return {
      hasFloorLevel: false,
      hasTotalFloors: false,
      floorLabel: null,
      totalFloorsLabel: null,
      category: 'land',
    };
  }

  // Standalone residential or industrial structures: total floors only
  if (
    ['house', 'villa', 'mansion', 'townhouse', 'farmhouse', 'warehouse', 'industrial'].includes(
      clean
    )
  ) {
    return {
      hasFloorLevel: false,
      hasTotalFloors: true,
      floorLabel: null,
      totalFloorsLabel:
        clean === 'warehouse' || clean === 'industrial'
          ? 'Facility Levels'
          : 'Total Stories / Floors',
      category: 'standalone',
    };
  }

  // Unit-style residences & multi-level commercial units: only total floors
  return {
    hasFloorLevel: false,
    hasTotalFloors: true,
    floorLabel: null,
    totalFloorsLabel: 'Total Floors in Building/Wing',
    category: 'unit',
  };
}

/**
 * Canonical Field Applicability Matrix
 * Single source of truth determining which fields apply, are rendered,
 * and are validated based on transaction type (sale vs rent) and classification.
 */
export function getPropertyFieldApplicability(type, listingType = 'sale') {
  const cleanType = String(type || '').trim().toLowerCase();
  const cleanListingType = String(listingType || 'sale').trim().toLowerCase();
  const isRent = cleanListingType === 'rent';
  const isSale = !isRent;

  const isLand = cleanType === 'plot';
  const isCommercial = ['office', 'shop', 'commercial', 'warehouse', 'industrial'].includes(cleanType);
  const isIndustrialOrWarehouse = ['warehouse', 'industrial'].includes(cleanType);
  const isOfficeOrRetail = ['office', 'shop', 'commercial'].includes(cleanType);
  const isResidential = !isLand && !isCommercial;
  const isStandalone = ['house', 'villa', 'mansion', 'townhouse', 'farmhouse'].includes(cleanType);
  const isUnitStyle = ['apartment', 'penthouse', 'studio'].includes(cleanType);

  const floorConfig = getFloorFieldConfig(cleanType);

  return {
    // Categorization
    category: isLand ? 'land' : isCommercial ? 'commercial' : 'residential',
    subCategory: isLand
      ? 'plot'
      : isIndustrialOrWarehouse
      ? 'industrial'
      : isCommercial
      ? 'commercial_unit'
      : isStandalone
      ? 'standalone_residential'
      : 'unit_residential',
    isLand,
    isCommercial,
    isIndustrialOrWarehouse,
    isResidential,
    isStandalone,
    isUnitStyle,
    isRent,
    isSale,

    // Core specifications
    hasBedrooms: isResidential,
    hasBathrooms: !isLand,
    bathroomsLabel: isCommercial ? 'Restrooms / Washrooms' : 'Bathrooms',
    hasBalconies: isResidential && cleanType !== 'studio',
    hasFloorLevel: floorConfig.hasFloorLevel,
    hasTotalFloors: floorConfig.hasTotalFloors,
    floorLabel: floorConfig.floorLabel,
    totalFloorsLabel: floorConfig.totalFloorsLabel,

    // Area measurements
    hasBuiltUpArea: !isLand,
    builtUpAreaLabel: isIndustrialOrWarehouse
      ? 'Facility Super Built-up (sq ft)'
      : isCommercial
      ? 'Commercial Built-up Area (sq ft)'
      : 'Super Built-up Area (sq ft)',
    hasCarpetArea: !isLand,
    hasPlotArea: isLand,
    plotAreaLabel: 'Total Plot / Land Area (sq ft)',

    // Architecture & orientation
    hasFacing: true,
    hasFurnishing: isResidential || isOfficeOrRetail,

    // Land specific fields
    hasZoning: isLand,
    hasBoundary: isLand,
    hasRoadFrontage: isLand,

    // Commercial / Warehouse specific fields
    hasCeilingHeight: isCommercial,
    hasLoadingDocks: isIndustrialOrWarehouse,
    hasPowerLoad: isCommercial,

    // Terms & Regulatory (Sale vs Rent)
    hasReraId: true,
    hasPossessionStatus: isSale,
    hasAge: isSale && !isLand,
    hasOwnership: true,

    // Rent specific terms
    hasAvailableFrom: isRent,
    hasSecurityDeposit: isRent,
    hasMaintenance: isRent && !isLand,
    hasMinLease: isRent,
    hasNoticePeriod: isRent,
    hasPreferredTenants: isRent,
    hasPetsAllowed: isRent && isResidential,

    // Utilities & Amenities
    hasParking: !isLand,
    parkingLabel: isCommercial ? 'Dedicated Parking Bays' : 'Reserved Covered Parking',
    hasWaterSupply: !isLand,
    hasPowerBackup: !isLand,
    hasSecurity: true,
    hasGated: true,
    hasLift: floorConfig.hasFloorLevel || (isCommercial && floorConfig.hasTotalFloors),
    hasGym: isResidential && (isUnitStyle || ['villa', 'mansion'].includes(cleanType)),
    hasPool: isResidential && (isUnitStyle || ['villa', 'mansion'].includes(cleanType)),
    hasGarden: isResidential,
  };
}

/**
 * Immutable identity fields that cannot be altered after listing creation.
 * Rendered as read-only verified summary chips in Edit mode.
 */
export const IDENTITY_PROPERTY_FIELDS = [
  'id',
  'propertyId',
  'agentId',
  'listingType',
  'type',
  'address',
  'locality',
  'city',
  'state',
  'pin',
  'lat',
  'lng',
  'reraId',
  'ownership',
];

/**
 * Permitted fields an Agent can edit on a published property:
 * Restricted strictly to Narrative Description & Valuation Terms,
 * Photo gallery (max 5), and 360° tour asset (only if approved Premium).
 */
export const EDITABLE_PROPERTY_FIELDS = [
  'title',
  'description',
  'price',
  'tokenAmount',
  'deposit',
  'securityDeposit',
  'maintenance',
  'minLease',
  'noticePeriod',
  'preferredTenants',
  'images',
  'coverImage',
  'tour360Url',
  'panoramaUrl',
];

/**
 * All eight canonical compass directions for entrance and plot facing.
 */
export const ENTRANCE_FACING_DIRECTIONS = [
  'North',
  'North-East',
  'East',
  'South-East',
  'South',
  'South-West',
  'West',
  'North-West',
];

/**
 * Safely format and normalize facing direction values, mapping abbreviations
 * and legacy casing into canonical compass direction labels.
 */
export function formatFacingDirection(val) {
  if (!val || typeof val !== 'string') return 'East';
  const clean = val.trim();
  const normalized = clean.toLowerCase().replace(/[\s_-]+/g, '');
  const map = {
    n: 'North',
    north: 'North',
    ne: 'North-East',
    northeast: 'North-East',
    e: 'East',
    east: 'East',
    se: 'South-East',
    southeast: 'South-East',
    s: 'South',
    south: 'South',
    sw: 'South-West',
    southwest: 'South-West',
    w: 'West',
    west: 'West',
    nw: 'North-West',
    northwest: 'North-West',
  };
  return map[normalized] || clean;
}

/**
 * Format possession status values (e.g. read_to_move, ready_to_move, under_construction)
 * to polished user-facing label ("Ready to Move", "Under Construction").
 */
export function formatPossessionStatus(val) {
  if (!val || typeof val !== 'string') return '';
  const clean = val.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  if (clean === 'ready_to_move' || clean === 'read_to_move') {
    return 'Ready to Move';
  }
  if (clean === 'under_construction') {
    return 'Under Construction';
  }
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}




