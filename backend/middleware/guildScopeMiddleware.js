// middleware/guildScopeMiddleware.js
const db = require('../models');

const guildScopeMiddleware = async (req, res, next) => {
  try {
    // Extract guild ID from various possible sources
    const guildId = req.params.guildId || req.query.guildId || req.body?.guildId;
    
    if (guildId) {
      // Store guild ID in request for controllers to use
      req.guildId = guildId;
      console.log(`Setting request guildId to ${guildId} from parameters`);
    } 
    // If no guildId in request params but user is authenticated, try to get default guild
    else if (req.isAuthenticated() && req.path.includes('/events')) { // Only for events-related endpoints
      const userGuild = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]  // Get most recent guild
      });
      
      if (userGuild) {
        req.guildId = userGuild.guild_id;
        console.log(`Setting default guildId to ${userGuild.guild_id} from user membership`);
      }
    }
    
    // Create a scope helper function for convenience
    req.applyGuildScope = (model) => {
      return model.scope({ method: ['forGuild', req.guildId] });
    };
    
    next();
  } catch (error) {
    console.error('Error in guildScopeMiddleware:', error);
    next(); // Continue even if there's an error
  }
};

module.exports = guildScopeMiddleware;