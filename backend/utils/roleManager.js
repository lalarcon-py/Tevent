// Handles role recalculation when a user's guild memberships change
const db = require('../models');
const { sequelize } = require('../config/database');
const { ROLE_HIERARCHY } = require('./helpers');

// After a user leaves a guild, recalculates their global role based on what guilds
// they still belong to. Pass an existing transaction if you're calling this mid-operation.
const updateUserRoleAfterGuildLeave = async (userId, existingTransaction = null) => {
  const t = existingTransaction || await sequelize.transaction();
  const shouldCommit = !existingTransaction;

  try {
    console.log(`Recalculating role for user ${userId} after guild leave`);

    const remainingMemberships = await db.GuildMember.findAll({
      where: { user_id: userId },
      transaction: t
    });

    let highestRole = 'Member';
    let highestRank = 1;

    for (const membership of remainingMemberships) {
      const rank = ROLE_HIERARCHY[membership.role] || 0;
      if (rank > highestRank) {
        highestRole = membership.role;
        highestRank = rank;
      }
    }

    const user = await db.User.findByPk(userId, {
      attributes: ['role', 'username'],
      transaction: t
    });

    console.log(`Updating user ${userId} role: "${user?.role}" -> "${highestRole}"`);

    await db.User.update({ role: highestRole }, { where: { id: userId }, transaction: t });

    try {
      if (db.AdminLog) {
        await db.AdminLog.create({
          admin_id: 'system',
          action: 'UPDATE_USER_ROLE',
          target_type: 'user',
          target_id: userId,
          details: {
            oldRole: user?.role,
            newRole: highestRole,
            reason: 'Guild leave role adjustment'
          }
        }, { transaction: t });
      }
    } catch (logError) {
      // Logging failure shouldn't block the actual role update
      console.error('Failed to log role update:', logError.message);
    }

    if (shouldCommit) await t.commit();
    return { success: true, newRole: highestRole };
  } catch (error) {
    if (shouldCommit && t) await t.rollback();
    console.error(`Error updating role after guild leave: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { updateUserRoleAfterGuildLeave };
