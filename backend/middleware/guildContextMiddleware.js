// backend/middleware/guildContextMiddleware.js
const db = require('../models');
const { setGuildContext } = require('../utils/guildContext');

const guildContextMiddleware = async (req, res, next) => {
  // Skip if not authenticated
  if (!req.isAuthenticated()) {
    return next();
  }
  
  try {
    // Extract guild ID from various possible sources - add optional chaining
    const guildId = req.params?.guildId || req.query?.guildId || (req.body && req.body.guildId);
    
    if (!guildId) {
      return next();
    }
    
    // Store in session for potential use
    if (req.session) {
      req.session.guildId = guildId;
    }
    
    // Set guild context for this request
    setGuildContext(guildId);
    
    // Find the user's membership in this guild
    const guildMember = await db.GuildMember.findOne({
      where: {
        user_id: req.user.id,
        guild_id: guildId
      }
    });
    
    if (guildMember) {
      // Attach guild-specific role information to the user object
      req.user.guildRole = guildMember.role;
      req.user.effectiveRole = guildMember.role;
      
      // If their guild role is higher than their global role, update the session
      const roleHierarchy = {
        'Guild Master': 4,
        'Guild Advisor': 3,
        'Guild Guardian': 2,
        'Member': 1,
        'Guild Member': 1
      };
      
      const guildRoleRank = roleHierarchy[guildMember.role] || 0;
      const globalRoleRank = roleHierarchy[req.user.role] || 0;
      
      if (guildRoleRank > globalRoleRank) {
        // Update effective role for this request
        req.user.effectiveRole = guildMember.role;
      }
    }
    
    next();
  } catch (error) {
    console.error('Guild context middleware error:', error);
    next(); // Continue despite errors to avoid breaking the application
  }
};

module.exports = guildContextMiddleware;