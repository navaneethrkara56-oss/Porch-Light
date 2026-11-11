export const ROLES = {
  GUEST: 'guest',
  USER: 'user',
  AGENT: 'agent',
  ADMIN: 'admin',
};

export function canViewPropertyDetails(role) {
  return role && role !== ROLES.GUEST;
}

export function canBookOrBuy(role) {
  return role === ROLES.USER;
}

export function canPublishListing(role, isVerified = false) {
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.AGENT && isVerified) return true;
  return false;
}

export function canAccessAdmin(role) {
  return role === ROLES.ADMIN;
}

export function canAccessAgent(role) {
  return role === ROLES.AGENT;
}

export function canAccessUserDashboard(role) {
  return role === ROLES.USER;
}
