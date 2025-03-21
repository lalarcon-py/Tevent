// frontend/src/utils/permissions.js
/**
 * Check if a user has permission based on their role
 * @param {Object} user - User object from auth context
 * @param {Array<string>} requiredRoles - Array of roles that have permission
 * @returns {boolean} - Whether the user has permission
 */
export const hasPermission = (user, requiredRoles) => {
    if (!user) return false;
    
    // Use the most guild-specific role when available
    // Priority: effectiveRole > guildRole > role
    const role = user.effectiveRole || user.guildRole || user.role;
    
    // Normalize roles for case-insensitive comparison
    const normalizedRole = role ? role.toLowerCase().trim() : '';
    const normalizedRequiredRoles = requiredRoles.map(r => r.toLowerCase().trim());
    
    return normalizedRequiredRoles.includes(normalizedRole);
  };
  
  /**
   * Check if user can manage guild storage (Guild Master or Guild Advisor)
   */
  export const canManageStorage = (user) => {
    return hasPermission(user, ['Guild Master', 'Guild Advisor']);
  };
  
  /**
   * Check if user is a Guild Master
   */
  export const isGuildMaster = (user) => {
    return hasPermission(user, ['Guild Master']);
  };