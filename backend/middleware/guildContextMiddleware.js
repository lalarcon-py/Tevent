// backend/middleware/guildContextMiddleware.js
const { setGuildContext } = require('../utils/guildContext');

const guildContextMiddleware = (req, res, next) => {
  // Extract guild ID from various possible sources
  const guildId = req.params.guildId || req.query.guildId || req.body?.guildId;
  
  if (!guildId) {
    return next();
  }

  // Run the next middleware within the guild context
  setGuildContext(guildId, () => {
    next();
  });
};

module.exports = guildContextMiddleware;