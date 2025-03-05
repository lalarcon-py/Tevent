// backend/middleware/databaseMiddleware.js
const { sequelize } = require('../config/database');

/**
 * Database middleware that handles guild context without schema switching
 */
const databaseMiddleware = async (req, res, next) => {
  // Extract guild ID from various possible sources
  const guildId = req.params.guildId || req.query.guildId || req.body?.guildId;
  
  if (guildId) {
    // Store guild ID in request for controllers to use
    req.guildId = guildId;
    console.log(`Set request guildId to ${guildId}`);
  }

  // Continue to next middleware - no schema switching needed
  next();
};

module.exports = databaseMiddleware;