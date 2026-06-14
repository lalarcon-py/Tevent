// Verifies the authenticated user belongs to the guild referenced in the request,
// then attaches their membership info to req.user for role-based checks downstream.
const db = require('../models');
const { ROLE_HIERARCHY } = require('../utils/helpers');

const validateGuildMembership = async (req, res, next) => {
  if (!req.isAuthenticated()) return next();

  try {
    const guildId = req.params?.guildId || req.query?.guildId || req.body?.guildId;
    if (!guildId) return next();

    if (req.session) req.session.guildId = guildId;

    const guildMember = await db.GuildMember.findOne({
      where: { user_id: req.user.id, guild_id: guildId }
    });

    if (guildMember) {
      req.user.guildRole = guildMember.role;
      req.user.effectiveRole = guildMember.role;
      req.user.guildMembership = {
        id: guildMember.id,
        guild_id: guildMember.guild_id,
        role: guildMember.role,
        joined_at: guildMember.created_at
      };

      const guildRank = ROLE_HIERARCHY[guildMember.role] || 0;
      const globalRank = ROLE_HIERARCHY[req.user.role] || 0;

      if (guildRank > globalRank) {
        req.user.role = guildMember.role;
      }
    }

    next();
  } catch (error) {
    console.error('Guild membership middleware error:', error);
    next();
  }
};

module.exports = validateGuildMembership;
