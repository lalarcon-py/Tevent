// Attaches guild-scoped role info to req.user for the duration of the request.
// Runs early in the middleware stack so downstream handlers can read req.user.effectiveRole.
const db = require('../models');
const { setGuildContext } = require('../utils/guildContext');
const { ROLE_HIERARCHY } = require('../utils/helpers');

const guildContextMiddleware = async (req, res, next) => {
  if (!req.isAuthenticated()) return next();

  try {
    const guildId = req.params?.guildId || req.query?.guildId || req.body?.guildId;
    if (!guildId) return next();

    if (req.session) req.session.guildId = guildId;
    setGuildContext(guildId);

    const guildMember = await db.GuildMember.findOne({
      where: { user_id: req.user.id, guild_id: guildId }
    });

    if (guildMember) {
      req.user.guildRole = guildMember.role;
      req.user.effectiveRole = guildMember.role;

      const guildRank = ROLE_HIERARCHY[guildMember.role] || 0;
      const globalRank = ROLE_HIERARCHY[req.user.role] || 0;

      // If the guild role outranks the global one, use it as the effective role for this request
      if (guildRank > globalRank) {
        req.user.effectiveRole = guildMember.role;
      }
    }

    next();
  } catch (error) {
    console.error('Guild context middleware error:', error);
    next();
  }
};

module.exports = guildContextMiddleware;
