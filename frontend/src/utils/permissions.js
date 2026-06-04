// frontend/src/utils/permissions.js

export const hasPermission = (user, requiredRoles) => {
    if (!user) return false;
    
    // Use the most guild-specific role when available
    // Priority: effectiveRole > guildRole > role
    const role = user.effectiveRole || user.guildRole || user.role;
    
    const normalizedRole = role ? role.toLowerCase().trim() : '';
    const normalizedRequiredRoles = requiredRoles.map(r => r.toLowerCase().trim());
    
    return normalizedRequiredRoles.includes(normalizedRole);
  };

  export const canManageStorage = (user) => {
    return hasPermission(user, ['Guild Master', 'Guild Advisor']);
  };

  export const isGuildMaster = (user) => {
    return hasPermission(user, ['Guild Master']);
  };