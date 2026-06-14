// Handles role consistency fixes between guild_members and users tables
const db = require('../models');
const { sequelize } = require('../config/database');
const { logAdminAction } = require('./adminLogger');
const { ROLE_HIERARCHY } = require('./helpers');

// Scans for Guild Masters in guild_members whose global user record still shows a lower role,
// then syncs them up. Useful as a one-time or scheduled repair job.
const fixRoleInconsistencies = async () => {
  const t = await sequelize.transaction();
  let updatedCount = 0;

  try {
    console.log('Starting role consistency migration...');

    const guildMasters = await db.GuildMember.findAll({
      where: { role: 'Guild Master' },
      attributes: ['user_id'],
      raw: true
    });

    const userIds = [...new Set(guildMasters.map(gm => gm.user_id))];
    console.log(`Found ${userIds.length} unique users with Guild Master role in guilds`);

    const usersToUpdate = await db.User.findAll({
      where: {
        id: { [db.Sequelize.Op.in]: userIds },
        role: { [db.Sequelize.Op.ne]: 'Guild Master' }
      },
      attributes: ['id', 'username', 'role']
    });

    console.log(`Found ${usersToUpdate.length} users with inconsistent roles`);

    for (const user of usersToUpdate) {
      console.log(`Updating user ${user.username} (${user.id}) from "${user.role}" to "Guild Master"`);

      await db.User.update(
        { role: 'Guild Master' },
        { where: { id: user.id }, transaction: t }
      );

      await logAdminAction('system', 'UPDATE_USER_ROLE', 'user', user.id, {
        oldRole: user.role,
        newRole: 'Guild Master',
        reason: 'Role migration'
      });

      updatedCount++;
    }

    await t.commit();
    console.log(`Migration complete. Updated ${updatedCount} users.`);
    return { success: true, updatedCount };
  } catch (error) {
    await t.rollback();
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
};

// Updates a user's global role to reflect the highest role they still hold
// after leaving a guild. Delegates to roleManager so there's only one implementation.
const updateUserRoleAfterGuildLeave = async (userId) => {
  const t = await sequelize.transaction();

  try {
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

    await db.User.update({ role: highestRole }, { where: { id: userId }, transaction: t });
    await t.commit();
    return { success: true, newRole: highestRole };
  } catch (error) {
    await t.rollback();
    console.error(`Error updating role after guild leave: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  fixRoleInconsistencies,
  updateUserRoleAfterGuildLeave
};
