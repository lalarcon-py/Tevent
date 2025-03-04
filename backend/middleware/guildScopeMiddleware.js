// middleware/guildScopeMiddleware.js
const guildScopeMiddleware = (req, res, next) => {
  // Extract guild ID from various possible sources
  const guildId = req.params.guildId || req.query.guildId || req.body?.guildId;
  
  if (guildId) {
    // Store guild ID in request for controllers to use
    req.guildId = guildId;
    
    // Create a scope helper function for convenience
    req.applyGuildScope = (model) => {
      return model.scope({ method: ['forGuild', guildId] });
    };
  }
  
  next();
};

module.exports = guildScopeMiddleware;