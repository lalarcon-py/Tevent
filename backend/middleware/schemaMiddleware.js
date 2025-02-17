const schemaManager = require('../utils/schemaManager');

const schemaMiddleware = async (req, res, next) => {
    const guildId = req.params.guildId || req.query.guildId;
    
    try {
      if (guildId) {
        // Set schema path for guild-specific routes
        await req.sequelize.query(`SET search_path TO guild_${guildId}, public`);
      } else {
        // Set schema path for public routes
        await req.sequelize.query(`SET search_path TO public`);
      }
      next();
    } catch (error) {
      console.error('Schema selection error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  };

module.exports = schemaMiddleware;