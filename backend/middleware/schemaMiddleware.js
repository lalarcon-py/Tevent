// backend/middleware/schemaMiddleware.js
const { sequelize } = require('../config/database');

// Cache to store the current schema for each request
const requestSchemaCache = new WeakMap();

const schemaMiddleware = async (req, res, next) => {
  const guildId = req.params.guildId || req.query.guildId;
  
  try {
    // Check if we already set this schema for this request
    if (requestSchemaCache.has(req)) {
      const cachedGuildId = requestSchemaCache.get(req);
      if (cachedGuildId === guildId) {
        return next(); // Skip if schema already set for this request
      }
    }
    
    if (guildId) {
      // Set schema path for guild-specific routes (silenced logging)
      await sequelize.query(`SET search_path TO guild_${guildId}, public`, { logging: false });
    } else {
      // Set schema path for public routes (silenced logging)
      await sequelize.query(`SET search_path TO public`, { logging: false });
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