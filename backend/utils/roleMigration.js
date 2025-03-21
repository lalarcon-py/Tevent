// backend/utils/roleMigration.js
const db = require('../models');
const { sequelize } = require('../config/database');
const { logAdminAction } = require('./adminLogger');

/**
 * Fix role inconsistencies between guild_members and users tables
 * - Ensures all Guild Masters in the guild_members table also have that role in the users table
 */
const fixRoleInconsistencies = async () => {
  const t = await sequelize.transaction();
  let updatedCount = 0;
  
  try {
    console.log('Starting role consistency migration...');
    
    // Find all Guild Masters in guild_members
    const guildMasters = await db.GuildMember.findAll({
      where: { role: 'Guild Master' },
      attributes: ['user_id'],
      raw: true
    });
    
    const userIds = [...new Set(guildMasters.map(gm => gm.user_id))];
    console.log(`Found ${userIds.length} unique users with Guild Master role in guilds`);
    
    // Get users who don't have Guild Master role in users table
    const usersToUpdate = await db.User.findAll({
      where: { 
        id: { [db.Sequelize.Op.in]: userIds },
        role: { [db.Sequelize.Op.ne]: 'Guild Master' }
      },
      attributes: ['id', 'username', 'role']
    });
    
    console.log(`Found ${usersToUpdate.length} users with inconsistent roles`);
    
    // Update each user
    for (const user of usersToUpdate) {
      console.log(`Updating user ${user.username} (${user.id}) from role "${user.role}" to "Guild Master"`);
      
      await db.User.update(
        { role: 'Guild Master' },
        { 
          where: { id: user.id },
          transaction: t 
        }
      );
      
      // Log the admin action
      await logAdminAction(
        'system',
        'UPDATE_USER_ROLE',
        'user',
        user.id,
        { oldRole: user.role, newRole: 'Guild Master', reason: 'Role migration' }
      );
      
      updatedCount++;
    }
    
    await t.commit();
    console.log(`Migration completed successfully. Updated ${updatedCount} users.`);
    
    return {
      success: true,
      updatedCount
    };
  } catch (error) {
    await t.rollback();
    console.error('Migration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const updateUserRoleAfterGuildLeave = async (userId) => {
    const t = await sequelize.transaction();
    
    try {
      // Find user's remaining guild memberships
      const remainingMemberships = await db.GuildMember.findAll({
        where: { user_id: userId },
        transaction: t
      });
      
      // Find the highest remaining role
      let highestRole = 'Member'; // Default if no memberships remain
      let highestRoleRank = 1;
      
      const roleHierarchy = {
        'Guild Master': 4,
        'Guild Advisor': 3,
        'Guild Guardian': 2,
        'Member': 1
      };
      
      for (const membership of remainingMemberships) {
        const roleRank = roleHierarchy[membership.role] || 0;
        if (roleRank > highestRoleRank) {
          highestRole = membership.role;
          highestRoleRank = roleRank;
        }
      }
      
      // Update user's global role to match their highest remaining role
      await db.User.update(
        { role: highestRole },
        { 
          where: { id: userId },
          transaction: t 
        }
      );
      
      await t.commit();
      return { success: true, newRole: highestRole };
    } catch (error) {
      await t.rollback();
      console.error(`Error updating user role after guild leave: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

module.exports = {
  fixRoleInconsistencies
};