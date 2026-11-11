/**
 * Premium Listing Status Evaluator
 * Eligibility rule: Premium status only.
 * Price thresholds and typologies no longer grant automatic Premium status.
 * Premium status is granted exclusively through verified promotion request approval.
 * Premium status adds the Premium tag and enables interactive 360° virtual tours.
 */
export function isPremium(property) {
  if (!property) return false;
  return Boolean(property.isPremium || property.isPremiumAdminFlag || property.isPremiumBadge);
}

