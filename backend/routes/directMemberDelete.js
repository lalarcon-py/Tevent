// backend/routes/directMemberDelete.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const db = require('../models');

/**
 * Direct SQL query endpoint to fetch guild members
 * This bypasses the ORM completely to ensure we get the current state of the database
 */
router.get('/hard-fetch/guild/:guildId/members', async (req, res) => {
  // Start a transaction for consistency
  const t = await sequelize.transaction({ readOnly: true });
  
  try {
    if (!req.isAuthenticated()) {
      await t.rollback();
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId } = req.params;
    
    console.log(`[HARD-FETCH] Fetching members for guild ${guildId} with direct SQL`);
    
    // Verify requester is a member of this guild
    const [requesterMembership] = await sequelize.query(
      `SELECT id FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :userId`,
      {
        replacements: { 
          guildId, 
          userId: req.user.id
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    if (!requesterMembership) {
      await t.rollback();
      return res.status(403).json({ error: 'Not a member of this guild' });
    }
    
    // Get all members with direct SQL query to bypass any caching or soft-deletion issues
    const [members] = await sequelize.query(
      `SELECT 
         u.id, u.username, u.discord_id, u.avatar_url, u.combat_power, u.builds, u.status,
         gm.role, gm.created_at as joined_at, gm.joined_via_invite
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId
       ORDER BY
         CASE 
           WHEN gm.role = 'Guild Master' THEN 1
           WHEN gm.role = 'Guild Advisor' THEN 2
           WHEN gm.role = 'Guild Guardian' THEN 3
           ELSE 4
         END ASC,
         gm.created_at ASC`,
      {
        replacements: { guildId },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    // Process the builds to ensure they're in the right format
    const processedMembers = members.map(member => ({
      ...member,
      builds: typeof member.builds === 'string' ? JSON.parse(member.builds) : member.builds || [],
      avatarUrl: member.avatar_url, // Add alias for frontend compatibility
      discordId: member.discord_id // Add alias for frontend compatibility
    }));
    
    console.log(`[HARD-FETCH] Successfully fetched ${processedMembers.length} members`)
    
    await t.commit();
    res.json(processedMembers);
    
  } catch (error) {
    // Rollback if there's an error
    if (t && !t.finished) {
      await t.rollback();
    }
    
    console.error('[HARD-FETCH] Error fetching guild members:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch guild members', 
      details: error.message
    });
  }
});

/**
 * Direct member deletion route that bypasses ORM and uses raw SQL
 * This ensures hard deletion of members without soft delete or paranoid mode interference
 */
router.delete('/hard-delete/guild/:guildId/member/:memberId', async (req, res) => {
  // Start a transaction to ensure all operations happen together
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      await t.rollback();
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, memberId } = req.params;
    
    // Log the request for debugging
    console.log(`[HARD-DELETE] Attempting to remove member ${memberId} from guild ${guildId}`);
    console.log(`[HARD-DELETE] Request made by user ${req.user.id}`);
    
    // Verify requester is a Guild Master of this guild
    const [requesterRole] = await sequelize.query(
      `SELECT role FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :userId`,
      {
        replacements: { 
          guildId, 
          userId: req.user.id
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    if (!requesterRole || requesterRole.role !== 'Guild Master') {
      await t.rollback();
      console.log(`[HARD-DELETE] Permission denied. User ${req.user.id} is not Guild Master of guild ${guildId}`);
      return res.status(403).json({ 
        error: 'Permission denied', 
        details: 'Only Guild Masters can remove members' 
      });
    }
    
    // Prevent Guild Masters from removing themselves
    if (memberId === req.user.id) {
      await t.rollback();
      console.log(`[HARD-DELETE] Guild Master attempted to remove themselves`);
      return res.status(400).json({
        error: 'Invalid operation',
        details: 'Guild Masters cannot remove themselves from the guild'
      });
    }
    
    // Get member details for logging and response
    const [memberCheck] = await sequelize.query(
      `SELECT gm.role, u.username 
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    if (!memberCheck) {
      await t.rollback();
      console.log(`[HARD-DELETE] Member ${memberId} not found in guild ${guildId}`);
      return res.status(404).json({ error: 'Member not found in this guild' });
    }
    
    // Prevent removing other Guild Masters
    if (memberCheck.role === 'Guild Master') {
      await t.rollback();
      console.log(`[HARD-DELETE] Attempted to remove another Guild Master`);
      return res.status(400).json({
        error: 'Invalid operation',
        details: 'Cannot remove a Guild Master'
      });
    }
    
    console.log(`[HARD-DELETE] Found member to remove: ${memberCheck.username} with role ${memberCheck.role}`);
    
    // Step 1: Hard delete the guild_member record
    const [, deleteResult] = await sequelize.query(
      `DELETE FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    console.log(`[HARD-DELETE] Deleted ${deleteResult} record(s) from guild_members table`);
    
    // Step 2: Delete guild-specific user records
    const [, userDeleteResult] = await sequelize.query(
      `DELETE FROM users 
       WHERE id = :memberId AND guild_id = :guildId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    console.log(`[HARD-DELETE] Deleted ${userDeleteResult} record(s) from users table`);
    
    // Step 3: Update loot requests
    const [, lootUpdateResult] = await sequelize.query(
      `UPDATE loot_requests
       SET status = 'Denied - Left Guild'
       WHERE guild_id = :guildId AND user_id = :memberId AND status = 'Pending'`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      }
    );
    
    console.log(`[HARD-DELETE] Updated ${lootUpdateResult} loot request(s)`);
    
    // Step 4: Delete wishlist entries
    const [, wishlistDeleteResult] = await sequelize.query(
      `DELETE FROM wishlists
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    console.log(`[HARD-DELETE] Deleted ${wishlistDeleteResult} wishlist entries`);
    
    // Step 5: Delete event participants
    const [, eventsDeleteResult] = await sequelize.query(
      `DELETE FROM event_participants
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    console.log(`[HARD-DELETE] Deleted ${eventsDeleteResult} event participant entries`);
    
    // Step 6: Delete team members
    const [, teamDeleteResult] = await sequelize.query(
      `DELETE FROM team_members
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    console.log(`[HARD-DELETE] Deleted ${teamDeleteResult} team member entries`);
    
    // The guild_members table doesn't have a deleted_at column (no soft delete)
    // so we skip the soft-delete cleanup step
    const softDeleteCleanupResult = 0;
    
    console.log(`[HARD-DELETE] No soft-deleted records cleanup needed (table doesn't use soft delete)`);
    
    // Step 8: Force database refresh in Sequelize cache
    await db.GuildMember.findAll({
      where: { guild_id: guildId },
      paranoid: false, // Include soft-deleted records
      transaction: t,
      // Force a true database query
      raw: true
    });
    
    // Commit all changes
    await t.commit();
    
    console.log(`[HARD-DELETE] Successfully removed ${memberCheck.username} from guild ${guildId}`);
    
    // Return success response
    res.json({ 
      success: true, 
      message: `${memberCheck.username} has been removed from the guild`,
      removedMemberId: memberId,
      details: {
        guildId,
        memberId,
        deletedFromGuildMembers: deleteResult,
        deletedFromUsers: userDeleteResult,
        updatedLootRequests: lootUpdateResult,
        deletedWishlistEntries: wishlistDeleteResult,
        deletedFromEvents: eventsDeleteResult,
        deletedFromTeams: teamDeleteResult,
        cleanedUpSoftDeleted: softDeleteCleanupResult
      }
    });
    
  } catch (error) {
    // Rollback if there's an error
    if (t && !t.finished) {
      await t.rollback();
    }
    
    console.error('[HARD-DELETE] Error removing guild member:', error);
    
    res.status(500).json({ 
      error: 'Failed to remove member from guild', 
      details: error.message
    });
  }
});

/**
 * Direct member deletion endpoint for when the standard delete route fails
 * This provides a more robust route with additional logging and error handling
 */
router.post('/direct-member-delete', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      await t.rollback();
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, memberId, forceDirect } = req.body;
    
    if (!forceDirect) {
      await t.rollback();
      return res.status(400).json({ error: 'Direct deletion not allowed without force flag' });
    }
    
    // Verify requester is a Guild Master of this guild
    const [requesterRole] = await sequelize.query(
      `SELECT role FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :userId`,
      {
        replacements: { 
          guildId, 
          userId: req.user.id
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    if (!requesterRole || requesterRole.role !== 'Guild Master') {
      await t.rollback();
      return res.status(403).json({ error: 'Only Guild Masters can perform this operation' });
    }
    
    // Use the same implementation as the DELETE endpoint
    // First check if the member exists
    const [memberCheck] = await sequelize.query(
      `SELECT gm.role, u.username 
       FROM guild_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.guild_id = :guildId AND gm.user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    // Hard delete from all relevant tables
    const [, deleteResult] = await sequelize.query(
      `DELETE FROM guild_members 
       WHERE guild_id = :guildId AND user_id = :memberId 
       AND user_id != :requesterId`,
      {
        replacements: { 
          guildId, 
          memberId,
          requesterId: req.user.id  // Prevent self-deletion
        },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    // Delete any guild-specific user records
    await sequelize.query(
      `DELETE FROM users 
       WHERE id = :memberId AND guild_id = :guildId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    // Clean up other related records
    await sequelize.query(
      `UPDATE loot_requests
       SET status = 'Denied - Left Guild'
       WHERE guild_id = :guildId AND user_id = :memberId AND status = 'Pending'`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      }
    );
    
    await sequelize.query(
      `DELETE FROM wishlists
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    await sequelize.query(
      `DELETE FROM event_participants
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    await sequelize.query(
      `DELETE FROM team_members
       WHERE guild_id = :guildId AND user_id = :memberId`,
      {
        replacements: { guildId, memberId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      }
    );
    
    // Force database refresh in Sequelize cache
    await db.GuildMember.findAll({
      where: { guild_id: guildId },
      paranoid: false,
      transaction: t,
      raw: true
    });
    
    await t.commit();
    
    const username = memberCheck ? memberCheck.username : 'Unknown user';
    console.log(`Direct delete successful: Removed ${username} from guild ${guildId}`);
    
    res.json({ 
      success: true, 
      message: memberCheck ? `${username} has been removed from the guild` : 'Member removed with direct database operation',
      affected: deleteResult
    });
    
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Direct member deletion error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;