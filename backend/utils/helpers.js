// backend/utils/helpers.js - Add these functions
/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - String to validate as UUID
 * @returns {boolean} True if valid UUID, false otherwise
 */
function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get role hierarchy value for comparison
 * @param {string} role - Role to evaluate
 * @returns {number} - Numeric value representing role rank
 */
function getRoleHierarchy(role) {
  const hierarchy = {
    'Guild Master': 4,
    'Guild Advisor': 3,
    'Guild Guardian': 2,
    'Member': 1,
    'Guild Member': 1
  };
  return hierarchy[role] || 0;
}

/**
 * Check if a user has permission for a given action based on required roles
 * @param {object} user - User object with role information
 * @param {Array<string>} requiredRoles - Array of roles that have permission
 * @returns {boolean} - Whether the user has permission
 */
function hasPermission(user, requiredRoles) {
  if (!user) return false;
  
  // Use effective role when available (from guild context)
  const role = user.effectiveRole || user.guildRole || user.role;
  
  if (!role) return false;
  
  // Normalize roles for case-insensitive comparison
  const normalizedRole = role.toLowerCase().trim();
  const normalizedRequiredRoles = requiredRoles.map(r => r.toLowerCase().trim());
  
  return normalizedRequiredRoles.includes(normalizedRole);
}

module.exports = {
  validateUUID,
  getRoleHierarchy,
  hasPermission
};