// backend/utils/membershipCleanup.js
const { sequelize } = require('../config/database');
const db = require('../models');

/**
 * Identifies and removes duplicate guild members
 * A duplicate is defined as multiple entries for the same user in the same guild
 */
async function cleanupDuplicateMembers() {
  const t = await sequelize.transaction();
  
  try {
    console.log('🧹 Starting duplicate guild membership cleanup...');
    
    // First, identify duplicates using a subquery
    // This query finds all guild_members with more than one entry per user_id and guild_id
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
      console.log('🧹 No duplicate guild memberships found.');
      await t.commit();
      return { success: true, removed: 0 };
    }
    
    console.log(`🧹 Found ${duplicates.length} guild membership entries for duplicated users.`);
    
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
        console.log(`🧹 Warning: No preferred entry found for user ${group[0]?.user_id} in guild ${group[0]?.guild_id}`);
        continue;
      }
      
      // Remove all other entries
      const toRemove = group.filter(item => item.row_num > 1);
      
      for (const duplicate of toRemove) {
        await sequelize.query(`
          DELETE FROM guild_members
          WHERE id = :id
        `, {
          replacements: { id: duplicate.id },
          type: sequelize.QueryTypes.DELETE,
          transaction: t
        });
        
        console.log(`🧹 Removed duplicate entry for ${duplicate.username} (${duplicate.user_id}) in guild ${duplicate.guild_id}`);
        removedCount++;
      }
    }
    
    await t.commit();
    console.log(`🧹 Duplicate membership cleanup completed. Removed ${removedCount} duplicate entries.`);
    
    return {
      success: true,
      removed: removedCount
    };
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Error cleaning up duplicate guild memberships:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Fixes orphaned guild memberships
 * This addresses the issue where removed members reappear after refresh
 */
async function verifyMembershipDeletions() {
  try {
    console.log('🧹 Starting verification of recent guild membership deletions...');
    
    // Additional verification to ensure deletions are permanent
    // This runs separate verification queries as a safety check
    const [orphanedMembers] = await sequelize.query(`
      SELECT COUNT(*) as orphaned_count 
      FROM guild_members
      WHERE deleted_at IS NOT NULL
    `);
    
    const orphanedCount = orphanedMembers[0]?.orphaned_count || 0;
    
    if (orphanedCount > 0) {
      console.log(`🧹 Found ${orphanedCount} soft-deleted memberships that should be hard deleted`);
      
      // Permanently remove soft-deleted memberships
      await sequelize.query(`
        DELETE FROM guild_members
        WHERE deleted_at IS NOT NULL
      `);
      
      console.log(`🧹 Permanently removed ${orphanedCount} soft-deleted memberships`);
    } else {
      console.log('🧹 No orphaned memberships found.');
    }
    
    return { 
      success: true,
      orphanedRemoved: orphanedCount
    };
  } catch (error) {
    console.error('Error verifying membership deletions:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Run both cleanup operations together
async function runMembershipCleanup() {
  const results = {
    duplicates: await cleanupDuplicateMembers(),
    orphaned: await verifyMembershipDeletions()
  };
  
  return results;
}

module.exports = {
  cleanupDuplicateMembers,
  verifyMembershipDeletions,
  runMembershipCleanup
};