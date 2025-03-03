// backend/middleware/schemaMiddleware.js
const { sequelize } = require('../config/database');

// Cache to store the current schema for each request
const requestSchemaCache = new WeakMap();

const schemaMiddleware = async (req, res, next) => {
  const guildId = req.params.guildId || req.query.guildId;
  
  try {
    // Always clear any previous schema setting for this request
    if (requestSchemaCache.has(req)) {
      requestSchemaCache.delete(req);
    }
    
    if (guildId) {
      // Log the schema switch for debugging
      console.log(`Setting schema path to guild_${guildId} for request to ${req.path}`);
      
      // Set schema path for guild-specific routes (force schema switch every time)
      await sequelize.query(`SET search_path TO guild_${guildId}, public`);
    } else {
      // Set schema path for public routes
      await sequelize.query(`SET search_path TO public`);
    }
    
    // Cache the guildId for this request
    requestSchemaCache.set(req, guildId);
    
    // Clean up cache after response
    res.on('finish', () => {
      requestSchemaCache.delete(req);
    });
    
    next();
  } catch (error) {
    console.error('Schema selection error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = schemaMiddleware;