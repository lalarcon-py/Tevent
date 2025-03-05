// backend/middleware/schemaMiddleware.js
/**
 * This middleware is a compatibility layer for the transition from schema-based
 * to guild_id-based architecture. It doesn't actually switch schemas anymore
 * but ensures compatibility with existing code.
 */
const schemaMiddleware = (req, res, next) => {
    // Extract guild ID from various possible sources
    const guildId = req.params.guildId || req.query.guildId || req.body?.guildId;
    
    if (guildId) {
      // Store guild ID in request for controllers to use
      req.guildId = guildId;
      console.log(`Schema middleware: set request guildId to ${guildId}`);
    }
  
    // Continue to next middleware - no schema switching needed
    next();
  };
  
  module.exports = schemaMiddleware;