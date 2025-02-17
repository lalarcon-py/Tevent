const databaseManager = require('../utils/databaseManager');

const databaseMiddleware = async (req, res, next) => {
  const guildId = req.params.guildId || req.query.guildId;
  
  if (!guildId) {
    return next();
  }

  try {
    req.db = await databaseManager.getGuildConnection(guildId);
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
};

module.exports = databaseMiddleware;