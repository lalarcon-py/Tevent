// Shared utility functions used across the backend

// Single source of truth for role rankings - used everywhere we need to compare roles
const ROLE_HIERARCHY = {
  'Guild Master': 4,
  'Guild Advisor': 3,
  'Guild Guardian': 2,
  'Guild Member': 1,
  'Member': 1
};

// Returns the numeric rank of a role for comparison (higher = more access)
function getRoleHierarchy(role) {
  return ROLE_HIERARCHY[role] || 0;
}

// Standard UUID v1-v5 validation
function validateUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

// Checks whether a user has one of the required roles, respecting guild-specific context
function hasPermission(user, requiredRoles) {
  if (!user) return false;

  const role = user.effectiveRole || user.guildRole || user.role;
  if (!role) return false;

  const normalizedRole = role.toLowerCase().trim();
  return requiredRoles.map(r => r.toLowerCase().trim()).includes(normalizedRole);
}

module.exports = {
  ROLE_HIERARCHY,
  getRoleHierarchy,
  validateUUID,
  hasPermission
};
