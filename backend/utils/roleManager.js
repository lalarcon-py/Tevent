// backend/utils/roleManager.js
const db = require('../models');
const { sequelize } = require('../config/database');

/**
 * Updates a user's global role after they leave a guild
 * This ensures users who leave a guild don't retain inappropriate roles
 * @param {string} userId - User ID
 * @param {Transaction} existingTransaction - Optional existing transaction to use
 * @returns {Promise<{success: boolean, newRole: string}>} Result of role update
 */
const updateUserRoleAfterGuildLeave = async (userId, existingTransaction = null) => {
  // Use existing transaction if provided, otherwise create a new one
  const t = existingTransaction || await sequelize.transaction();
  const shouldCommit = !existingTransaction; // Only commit if we created the transaction
  
  try {
    console.log(`Updating role for user ${userId} after guild leave`);
    
    // Find user's remaining guild memberships
    const remainingMemberships = await db.GuildMember.findAll({
      where: { user_id: userId },
      transaction: t
    });
    
    console.log(`User has ${remainingMemberships.length} guild memberships remaining`);
    
    // Find the highest remaining role
    let highestRole = 'Member'; // Default if no memberships remain
    let highestRoleRank = 1;
    
    const roleHierarchy = {
      'Guild Master': 4,
      'Guild Advisor': 3,
      'Guild Guardian': 2,
      'Guild Member': 1,
      'Member': 1
    };
    
    for (const membership of remainingMemberships) {
      const roleRank = roleHierarchy[membership.role] || 0;
      if (roleRank > highestRoleRank) {
        highestRole = membership.role;
        highestRoleRank = roleRank;
      }
    }
    
    // Get current role for logging
    const user = await db.User.findByPk(userId, {
      attributes: ['role', 'username'],
      transaction: t
    });
    
    const oldRole = user?.role || 'Unknown';
    
    console.log(`Updating user ${userId} role from "${oldRole}" to "${highestRole}"`);
    
    // ALWAYS update the role when leaving a guild to ensure it's correct
    // This is a critical change to fix the security issue
    await db.User.update(
      { role: highestRole },
      { 
        where: { id: userId },
        transaction: t 
      }
    );
    
    // Log the role change if AdminLog exists
    try {
      if (db.AdminLog) {
        await db.AdminLog.create({
          admin_id: 'system',
          action: 'UPDATE_USER_ROLE',
          target_type: 'user',
          target_id: userId,
          details: { 
            oldRole: oldRole, 
            newRole: highestRole, 
            reason: 'Guild leave role adjustment' 
          }
        }, { transaction: t });
      }
    } catch (logError) {
      console.error('Failed to log role update:', logError.message);
      // Don't throw here - logging failure shouldn't prevent role update
    }
    
    // Only commit if we created this transaction
    if (shouldCommit) {
      await t.commit();
    }
    
    return { success: true, newRole: highestRole };
  } catch (error) {
    // Only rollback if we created this transaction
    if (shouldCommit && t) {
      await t.rollback();
    }
    
    console.error(`Error updating user role after guild leave: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  updateUserRoleAfterGuildLeave
};