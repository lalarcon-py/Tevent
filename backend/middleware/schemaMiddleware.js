// backend/middleware/schemaMiddleware.js
const { sequelize } = require('../config/database');

// Cache to store the current schema for each request
const requestSchemaCache = new WeakMap();
const DEFAULT_SCHEMA = 'public';

/**
 * Middleware to ensure proper schema isolation between guilds
 */
const schemaMiddleware = async (req, res, next) => {
  const guildId = req.params.guildId || req.query.guildId;
  
  try {
    // Reset any existing schema setting from the connection
    if (requestSchemaCache.has(req)) {
      const previousSchema = requestSchemaCache.get(req);
      console.log(`[Schema] Clearing previous schema setting: ${previousSchema}`);
      requestSchemaCache.delete(req);
    }
    
    if (guildId) {
      const schemaName = `guild_${guildId}`;
      console.log(`[Schema] Setting schema path to ${schemaName} for request ${req.method} ${req.path}`);
      
      // Verify schema exists before attempting to use it
      const [schemaCheck] = await sequelize.query(
        `SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = $1)`,
        { 
          bind: [schemaName],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!schemaCheck.exists) {
        console.error(`[Schema] Attempted to use non-existent schema: ${schemaName}`);
        return res.status(404).json({ error: 'Guild not found' });
      }
      
      // Set schema path for guild-specific routes - NO FALLBACK to public
      await sequelize.query(`SET search_path TO "${schemaName}"`);
      
      // Store the schema we're using for this request
      requestSchemaCache.set(req, schemaName);
    } else {
      // Public routes should use only the public schema
      console.log(`[Schema] Setting schema path to ${DEFAULT_SCHEMA} for request ${req.method} ${req.path}`);
      await sequelize.query(`SET search_path TO ${DEFAULT_SCHEMA}`);
      requestSchemaCache.set(req, DEFAULT_SCHEMA);
    }
    
    // Make sure to reset schema path after the response is complete
    res.on('finish', async () => {
      try {
        if (requestSchemaCache.has(req)) {
          // Clean up schema setting and restore to default
          await sequelize.query(`SET search_path TO ${DEFAULT_SCHEMA}`);
          console.log(`[Schema] Reset schema path to ${DEFAULT_SCHEMA} after completing request ${req.method} ${req.path}`);
          requestSchemaCache.delete(req);
        }
      } catch (cleanupError) {
        console.error('[Schema] Error resetting schema path after request:', cleanupError);
      }
    });
    
    next();
  } catch (error) {
    console.error('[Schema] Schema selection error:', error);
    // Try to reset schema to public in case of error
    try {
      await sequelize.query(`SET search_path TO ${DEFAULT_SCHEMA}`);
    } catch (resetError) {
      console.error('[Schema] Failed to reset schema after error:', resetError);
    }
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = schemaMiddleware;