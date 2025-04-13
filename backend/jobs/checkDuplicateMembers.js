// backend/jobs/checkDuplicateMembers.js
const { sequelize } = require('../config/database');
const db = require('../models');

/**
 * Periodically checks for and removes duplicate guild members
 * This job should be run on a schedule to ensure guild member consistency
 */
async function checkDuplicateMembers() {
  const t = await sequelize.transaction();
  
  try {
    console.log('🔍 Starting scheduled duplicate member check...');
    
    // Find all guild_members with more than one entry per user_id and guild_id
    const [duplicates] = await sequelize.query(`
      SELECT gm.id, gm.user_id, gm.guild_id, gm.role, gm.created_at,
             u.username,
             ROW_NUMBER() OVER(PARTITION BY gm.user_id, gm.guild_id ORDER BY 
               CASE 
                 WHEN gm.role = 'Guild Master' THEN 1
                 WHEN gm.role = 'Guild Advisor' THEN 2
                 WHEN gm.role = 'Guild Guardian' THEN 3
                 ELSE 4
               END ASC,
               gm.created_at ASC
             ) as row_num
      FROM guild_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE (gm.user_id, gm.guild_id) IN (
        SELECT user_id, guild_id
        FROM guild_members
        GROUP BY user_id, guild_id
        HAVING COUNT(*) > 1
      )
      ORDER BY gm.guild_id, gm.user_id, row_num
    `, { transaction: t });
    
    if (duplicates.length === 0) {
      console.log('🔍 No duplicate guild memberships found in this check.');
      await t.commit();
      return { success: true, removed: 0 };
    }
    
    console.log(`🔍 Found ${duplicates.length} guild membership entries for duplicated users.`);
    
    // Group duplicates by guild_id and user_id
    const duplicateGroups = {};
    duplicates.forEach(dup => {
      const key = `${dup.guild_id}:${dup.user_id}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(dup);
    });
    
    // Process each group - keep the first entry (row_num = 1) and remove others
    let removedCount = 0;
    for (const group of Object.values(duplicateGroups)) {
      // Keep the first entry (has best role and earliest join date)
      const toKeep = group.find(item => item.row_num === 1);
      
      if (!toKeep) {
        console.error(`🔍 Warning: No preferred entry found for user ${group[0]?.user_id} in guild ${group[0]?.guild_id}`);
        continue;
      }
      
      // Log the membership we're keeping
      console.log(`🔍 Keeping membership for ${toKeep.username} (${toKeep.user_id}) in guild ${toKeep.guild_id} with role ${toKeep.role}`);
      
      // Remove all other entries
      const toRemove = group.filter(item => item.row_num > 1);
      
      for (const duplicate of toRemove) {
        // Use raw SQL for guaranteed deletion
        await sequelize.query(`
          DELETE FROM guild_members
          WHERE id = :id
        `, {
          replacements: { id: duplicate.id },
          type: sequelize.QueryTypes.DELETE,
          transaction: t
        });
        
        console.log(`🔍 Removed duplicate entry for ${duplicate.username} (${duplicate.user_id}) in guild ${duplicate.guild_id}`);
        removedCount++;
      }
    }
    
    await t.commit();
    console.log(`🔍 Duplicate member check completed. Removed ${removedCount} duplicate entries.`);
    
    return {
      success: true,
      removed: removedCount
    };
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Error checking for duplicate guild members:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Verifies that deleted members are actually removed from the database
 * Checks for and removes any soft-deleted members
 */
async function cleanupSoftDeletedMembers() {
  try {
    console.log('🧹 Starting soft-deleted member cleanup check...');
    
    // First check if the deleted_at column exists
    const [columnsCheck] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guild_members' 
      AND column_name = 'deleted_at'
    `);
    
    // If column doesn't exist yet, we can't proceed with this check
    if (columnsCheck.length === 0) {
      console.log('🧹 deleted_at column not found in guild_members table. Skipping soft deletion cleanup.');
      return { 
        success: true,
        columnMissing: true,
        removed: 0
      };
    }
    
    // Find soft-deleted members
    const [softDeletedCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM guild_members
      WHERE deleted_at IS NOT NULL
    `);
    
    const count = softDeletedCount[0]?.count || 0;
    
    if (count === 0) {
      console.log('🧹 No soft-deleted members found.');
      return { 
        success: true,
        removed: 0 
      };
    }
    
    console.log(`🧹 Found ${count} soft-deleted members to clean up`);
    
    // Hard delete the soft-deleted records
    await sequelize.query(`
      DELETE FROM guild_members
      WHERE deleted_at IS NOT NULL
    `);
    
    console.log(`🧹 Successfully removed ${count} soft-deleted members`);
    
    return { 
      success: true,
      removed: count
    };
  } catch (error) {
    console.error('Error in cleanupSoftDeletedMembers:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

module.exports = {
  checkDuplicateMembers,
  cleanupSoftDeletedMembers
};