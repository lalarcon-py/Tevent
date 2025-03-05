// backend/middleware/guildContextMiddleware.js
const guildContextMiddleware = (req, res, next) => {
  // Extract guild ID from various possible sources
  const guildId = req.params.guildId || req.query.guildId || req.body?.guildId;
  
  if (guildId) {
    // Store guild ID in request object
    req.guildId = guildId;
  }

  // Continue to next middleware without schema switching
  next();
};

module.exports = guildContextMiddleware;