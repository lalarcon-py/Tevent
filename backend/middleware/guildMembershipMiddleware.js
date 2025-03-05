// NEW FILE: backend/middleware/guildMembershipMiddleware.js
const db = require('../models');

const validateGuildMembership = async (req, res, next) => {
  // Extract guild ID from various possible sources
  const guildId = req.params.guildId || req.query.guildId || req.body.guildId || req.guildId;
  
  // Skip validation if no guild ID or not authenticated
  if (!guildId || !req.isAuthenticated()) {
    return next();
  }
  
  try {
    // Check if user is a member of this guild
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership) {
      return res.status(403).json({ 
        error: 'Not a member of this guild',
        details: 'You must be a member of this guild to access this resource'
      });
    }
    
    // Add membership info to request for potential role-based checks later
    req.guildMembership = membership;
    
    // Ensure guildId is set on the request
    req.guildId = guildId;
    
    next();
  } catch (error) {
    console.error('Guild membership check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = validateGuildMembership;