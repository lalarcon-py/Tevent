// backend/routes/directMemberDelete.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const db = require('../models');

/**
 * Direct member deletion endpoint for when the standard delete route fails
 * This provides a more robust route with additional logging and error handling
 */
router.post('/direct-member-delete', async (req, res) => {
  try {
    console.log('Direct member delete request received:', {
      body: req.body,
      user: req.user?.id
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, memberId } = req.body;
    
    if (!guildId || !memberId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'guildId and memberId are required' 
      });
    }

    // Validate UUIDs to prevent injection attacks
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(guildId) || !uuidPattern.test(memberId)) {
      return res.status(400).json({ error: 'Invalid guild or member ID format' });
    }
    
    // Verify requester is a Guild Master of this guild
    const requesterMembership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!requesterMembership || requesterMembership.role !== 'Guild Master') {
      console.log('Permission denied:', {
        userId: req.user.id,
        role: requesterMembership?.role
      });
      return res.status(403).json({ error: 'Only Guild Masters can perform this operation' });
    }
    
    // Get info about the member to be removed for logging purposes
    const memberInfo = await db.GuildMember.findOne({
      where: { 
        guild_id: guildId, 
        user_id: memberId 
      },
      include: [{
        model: db.User,
        attributes: ['username']
      }]
    });
    
    const memberUsername = memberInfo?.User?.username || 'Unknown User';
    
    // Prevent attempting to remove self
    if (memberId === req.user.id) {
      console.log('Attempted self-removal prevented');
      return res.status(400).json({ 
        error: 'Cannot remove yourself',
        details: 'Guild Masters should use the leave guild functionality instead'
      });
    }
    
    // Prevent removing other Guild Masters
    if (memberInfo?.role === 'Guild Master') {
      console.log('Attempted removal of another Guild Master prevented');
      return res.status(400).json({ error: 'Cannot remove another Guild Master' });
    }

    console.log(`Proceeding with removal of ${memberUsername} (${memberId}) from guild ${guildId}`);
    
    // Start a transaction for consistency
    const t = await sequelize.transaction();
    
    try {
      // Use raw SQL for guaranteed execution
      const [, rowCount] = await sequelize.query(
        `DELETE FROM guild_members 
         WHERE guild_id = :guildId 
         AND user_id = :memberId 
         AND user_id != :currentUserId`,
        {
          replacements: { 
            guildId, 
            memberId,
            currentUserId: req.user.id // Extra safety check
          },
          type: sequelize.QueryTypes.DELETE,
          transaction: t
        }
      );
      
      // Also clean up any associated data for this member
      // 1. Remove any pending loot requests
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
      
      // 2. Clean up wishlist entries
      await sequelize.query(
        `DELETE FROM wishlists
         WHERE guild_id = :guildId AND user_id = :memberId`,
        {
          replacements: { guildId, memberId },
          type: sequelize.QueryTypes.DELETE,
          transaction: t
        }
      );
      
      // Commit the transaction
      await t.commit();
      
      console.log(`Successfully removed ${memberUsername} from guild. Affected rows: ${rowCount}`);
      
      if (rowCount === 0) {
        return res.status(404).json({ 
          error: 'Member not found',
          details: 'No rows were affected by the deletion operation'
        });
      }
      
      // Return the updated list of members after removal
      const updatedMembers = await db.GuildMember.findAll({
        where: { guild_id: guildId },
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'avatar_url', 'discord_id', 'builds', 'combat_power']
        }],
        order: [
          [sequelize.literal(`CASE 
            WHEN "GuildMember"."role" = 'Guild Master' THEN 1
            WHEN "GuildMember"."role" = 'Guild Advisor' THEN 2
            WHEN "GuildMember"."role" = 'Guild Guardian' THEN 3
            ELSE 4
          END`), 'ASC'],
          ['created_at', 'ASC']
        ]
      });
      
      const formattedMembers = updatedMembers.map(member => ({
        id: member.User.id,
        username: member.User.username,
        avatarUrl: member.User.avatar_url,
        discordId: member.User.discord_id,
        role: member.role,
        builds: member.User.builds,
        combat_power: member.User.combat_power,
        joinedAt: member.created_at
      }));
      
      res.json({
        success: true,
        message: `${memberUsername} has been removed from the guild`,
        removedMemberId: memberId,
        updatedMembers: formattedMembers
      });
    } catch (txError) {
      // Rollback the transaction in case of error
      await t.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Error in direct member deletion:', error);
    res.status(500).json({ 
      error: 'Failed to remove member',
      details: error.message
    });
  }
});

module.exports = router;