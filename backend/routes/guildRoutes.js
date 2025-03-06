const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const crypto = require('crypto');
const schemaManager = require('../utils/schemaManager');
const db = require('../models');
const { sequelize } = require('../config/database');

// Create a new guild
// backend/routes/guildRoutes.js
router.post('/create', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;
    
    // Validate guild name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Guild name is required' });
    }
    
    // Additional validation if desired
    if (name.length < 3 || name.length > 50) {
      return res.status(400).json({ 
        error: 'Guild name must be between 3 and 50 characters' 
      });
    }
    
    const guildId = uuidv4();
    
    // Create new schema for the guild
    await schemaManager.initializeGuildData(guildId);
    
    // Create guild record
    const guild = await db.Guild.create({
      id: guildId,
      name: name.trim(), // Trim whitespace
      owner_id: req.user.discord_id,
      status: 'ACTIVE'
    }, { transaction: t });

    // Add user to guild members
    await db.GuildMember.create({
      guild_id: guildId,
      user_id: req.user.id,
      role: 'Guild Master'
    }, { transaction: t });

    await t.commit();

    res.json({ 
      guild,
      inviteLink: `${process.env.CLIENT_BASE_URL}/join/${guildId}`
    });
  } catch (error) {
    await t.rollback();
    console.error('Guild creation error:', error);
    res.status(500).json({ error: 'Failed to create guild' });
  }
});

// Join an existing guild (backward compatibility - kept as GET)
router.get('/join/:guildId', async (req, res) => {
  await joinGuild(req, res);
});

// Join an existing guild (new route - using POST for semantics)
router.post('/join/:guildId', async (req, res) => {
  await joinGuild(req, res);
});

// Common function for joining a guild
async function joinGuild(req, res) {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { guildId } = req.params;
    
    // Check if guild exists
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if guild is active
    if (guild.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Guild is not active' });
    }

    // Check if user is already a member
    const existingMember = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });

    if (!existingMember) {
      await db.GuildMember.create({
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Member'
      }, { transaction: t });
    }

    await t.commit();
    res.json({ guild });
  } catch (error) {
    await t.rollback();
    console.error('Guild join error:', error);
    res.status(500).json({ error: 'Failed to join guild' });
  }
}

// Leave a guild
router.post('/leave/:guildId', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { guildId } = req.params;
    
    // Check if guild exists
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this guild' });
    }
    
    // Check if user is the guild master
    if (membership.role === 'Guild Master') {
      // Find another member to transfer ownership to
      const newOwner = await db.GuildMember.findOne({
        where: {
          guild_id: guildId,
          user_id: { [Op.ne]: req.user.id }
        },
        order: [
          [sequelize.literal(`CASE 
            WHEN role = 'Guild Advisor' THEN 1
            WHEN role = 'Guild Guardian' THEN 2
            ELSE 3
          END`), 'ASC'],
          ['created_at', 'ASC']
        ]
      });
      
      if (newOwner) {
        // Transfer ownership
        await newOwner.update({ role: 'Guild Master' }, { transaction: t });
        
        // Log the transfer if you have a table for it
        if (db.GuildMasterTransfer) {
          await db.GuildMasterTransfer.create({
            old_gm_id: req.user.id,
            new_gm_id: newOwner.user_id,
            guild_id: guildId,
            transferred_at: new Date()
          }, { transaction: t });
        }
      } else {
        // No other members, mark guild for deletion
        await guild.update({ 
          status: 'PENDING_DELETION',
          deletion_scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days grace period
        }, { transaction: t });
      }
    }
    
    // Remove the user from the guild
    await membership.destroy({ transaction: t });
    
    // Check if guild is now empty
    const remainingMembers = await db.GuildMember.count({
      where: { guild_id: guildId }
    });
    
    if (remainingMembers === 0) {
      // Delete the guild and its data
      await deleteEmptyGuild(guildId, t);
    }
    
    await t.commit();
    
    res.status(200).json({ message: 'Successfully left guild' });
  } catch (error) {
    await t.rollback();
    console.error('Leave guild error:', error);
    res.status(500).json({ error: 'Failed to leave guild' });
  }
});

// Helper function to delete empty guilds
async function deleteEmptyGuild(guildId, transaction) {
  try {
    // Delete guild record
    await db.Guild.destroy({
      where: { id: guildId },
      transaction
    });
    
    // Drop the guild schema
    await schemaManager.deleteGuildData(guildId);
    
    console.log(`Guild ${guildId} deleted due to zero members`);
    return true;
  } catch (error) {
    console.error(`Failed to delete empty guild ${guildId}:`, error);
    throw error;
  }
}

// Get all guilds for the current user
router.get('/my-guilds', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const memberships = await db.GuildMember.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: db.Guild,
        attributes: ['id', 'name', 'owner_id', 'status', 'created_at']
      }]
    });
    
    const guilds = memberships.map(membership => ({
      id: membership.Guild.id,
      name: membership.Guild.name,
      role: membership.role,
      status: membership.Guild.status,
      joinedAt: membership.created_at
    }));
    
    res.json(guilds);
  } catch (error) {
    console.error('Get my guilds error:', error);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get all available guilds
router.get('/available', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get guilds the user is not already a member of
    const userGuildIds = await db.GuildMember.findAll({
      where: { user_id: req.user.id },
      attributes: ['guild_id']
    }).then(memberships => memberships.map(m => m.guild_id));
    
    const availableGuilds = await db.Guild.findAll({
      where: {
        id: { [Op.notIn]: userGuildIds },
        status: 'ACTIVE'
      },
      attributes: ['id', 'name', 'created_at']
    });
    
    // Get owner names and member counts
    const guildsWithDetails = await Promise.all(availableGuilds.map(async guild => {
      // Get owner
      const owner = await db.GuildMember.findOne({
        where: { 
          guild_id: guild.id,
          role: 'Guild Master'
        },
        include: [{
          model: db.User,
          attributes: ['username']
        }]
      });
      
      // Get member count
      const memberCount = await db.GuildMember.count({
        where: { guild_id: guild.id }
      });
      
      return {
        id: guild.id,
        name: guild.name,
        ownerName: owner?.User?.username || 'Unknown',
        memberCount,
        createdAt: guild.created_at
      };
    }));
    
    res.json(guildsWithDetails);
  } catch (error) {
    console.error('Get available guilds error:', error);
    res.status(500).json({ error: 'Failed to fetch available guilds' });
  }
});

// Transfer guild master role
router.post('/transfer-master', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId, newMasterId } = req.body;
    
    // Verify current user is the guild master
    const currentMaster = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Master'
      }
    });
    
    if (!currentMaster) {
      return res.status(403).json({ error: 'Only the Guild Master can transfer ownership' });
    }
    
    // Verify new master exists and is a member
    const newMaster = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: newMasterId
      }
    });
    
    if (!newMaster) {
      return res.status(404).json({ error: 'New master not found in guild' });
    }
    
    // *** ADD THIS LINE: Ensure we're in the public schema before updating guild members ***
    await sequelize.query(`SET search_path TO public`, { transaction: t });
    
    // Update roles
    await currentMaster.update({ role: 'Guild Advisor' }, { transaction: t });
    await newMaster.update({ role: 'Guild Master' }, { transaction: t });
    
    // Log the transfer if you have a table for it
    if (db.GuildMasterTransfer) {
      await db.GuildMasterTransfer.create({
        old_gm_id: req.user.id,
        new_gm_id: newMasterId,
        guild_id: guildId,
        transferred_at: new Date()
      }, { transaction: t });
    }
    
    await t.commit();
    
    res.status(200).json({ message: 'Guild master transferred successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Guild master transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer guild master' });
  }
});

// Generate an invite code for a guild
router.post('/:guildId/invite', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId } = req.params;
    
    // Check if user has permission to invite
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: {
          [Op.in]: ['Guild Master', 'Guild Advisor', 'Guild Guardian']
        }
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'No permission to generate invites' });
    }
    
    // Generate a unique invite code
    const inviteCode = crypto.randomBytes(8).toString('hex');
    
    // Store the invite if you have a table for it
    let invite;
    if (db.GuildInvite) {
      invite = await db.GuildInvite.create({
        guild_id: guildId,
        code: inviteCode,
        created_by: req.user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      });
    }
    
    res.status(200).json({
      inviteCode,
      inviteUrl: `${process.env.CLIENT_BASE_URL}/guilds/join/invite/${inviteCode}`,
      expiresAt: invite?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

// Join a guild using an invite code
router.post('/join/invite/:inviteCode', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { inviteCode } = req.params;
    
    // Find the invite if you have a table for it
    let invite, guildId;
    if (db.GuildInvite) {
      invite = await db.GuildInvite.findOne({
        where: {
          code: inviteCode,
          expires_at: {
            [Op.gt]: new Date()
          }
        }
      });
      
      if (!invite) {
        return res.status(404).json({ error: 'Invalid or expired invite' });
      }
      
      guildId = invite.guild_id;
    } else {
      // If you don't have an invites table, you'll need to handle this differently
      return res.status(501).json({ error: 'Invite system not implemented' });
    }
    
    // Check if user is already a member
    const existingMembership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this guild' });
    }
    
    // Add user to guild
    await db.GuildMember.create({
      guild_id: guildId,
      user_id: req.user.id,
      role: 'Guild Member',
      joined_via_invite: true,
      invited_by: invite?.created_by
    }, { transaction: t });
    
    // Update invite usage count
    if (invite) {
      await invite.increment('use_count', { transaction: t });
    }
    
    await t.commit();
    
    // Get guild info
    const guild = await db.Guild.findByPk(guildId);
    
    res.status(200).json({ 
      message: 'Successfully joined guild',
      guild
    });
  } catch (error) {
    await t.rollback();
    console.error('Join with invite error:', error);
    res.status(500).json({ error: 'Failed to join guild' });
  }
});

// Get guild details
router.get('/:guildId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId } = req.params;
    
    // Check if user is a member
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this guild' });
    }
    
    // Get guild details
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Get member count
    const memberCount = await db.GuildMember.count({
      where: { guild_id: guildId }
    });
    
    // Get guild master
    const guildMaster = await db.GuildMember.findOne({
      where: { 
        guild_id: guildId,
        role: 'Guild Master'
      },
      include: [{
        model: db.User,
        attributes: ['username', 'avatar_url']
      }]
    });
    
    res.json({
      id: guild.id,
      name: guild.name,
      status: guild.status,
      memberCount,
      guildMaster: guildMaster ? {
        id: guildMaster.user_id,
        username: guildMaster.User?.username,
        avatarUrl: guildMaster.User?.avatar_url
      } : null,
      userRole: membership.role,
      createdAt: guild.created_at
    });
  } catch (error) {
    console.error('Get guild details error:', error);
    res.status(500).json({ error: 'Failed to fetch guild details' });
  }
});

// Get guild members
router.get('/:guildId/members', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId } = req.params;
    
    // Check if user is a member
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this guild' });
    }
    
    // Get all members
    const members = await db.GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'discord_id']
      }],
      order: [
        [sequelize.literal(`CASE 
          WHEN role = 'Guild Master' THEN 1
          WHEN role = 'Guild Advisor' THEN 2
          WHEN role = 'Guild Guardian' THEN 3
          ELSE 4
        END`), 'ASC'],
        ['created_at', 'ASC']
      ]
    });
    
    const formattedMembers = members.map(member => ({
      id: member.User.id,
      username: member.User.username,
      avatarUrl: member.User.avatar_url,
      discordId: member.User.discord_id,
      role: member.role,
      joinedAt: member.created_at,
      joinedViaInvite: member.joined_via_invite || false
    }));
    
    res.json(formattedMembers);
  } catch (error) {
    console.error('Get guild members error:', error);
    res.status(500).json({ error: 'Failed to fetch guild members' });
  }
});

router.get('/:guildId/debug-settings', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Direct SQL query to bypass any ORM issues
    const [results] = await db.sequelize.query(
      `SELECT id, name, dkp_enabled FROM guilds WHERE id = :guildId`,
      { 
        replacements: { guildId },
        type: db.sequelize.QueryTypes.SELECT
      }
    );
    
    res.json({
      rawDatabaseValue: results,
      message: "This is the direct database value for troubleshooting"
    });
  } catch (error) {
    console.error('Debug query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a guild (admin only)
router.delete('/:guildId', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId } = req.params;
    
    // Check if user is the guild master
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Master'
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'Only the Guild Master can delete a guild' });
    }
    
    // Delete the guild
    await deleteEmptyGuild(guildId, t);
    
    await t.commit();
    
    res.status(200).json({ message: 'Guild deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Delete guild error:', error);
    res.status(500).json({ error: 'Failed to delete guild' });
  }
});

router.put('/members/:userId/update-name', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { userId } = req.params;
    const { username, guildId } = req.body;
    
    // Only allow users to change their own name
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only change your own name' });
    }
    
    // Ensure we're in the public schema
    await sequelize.query(`SET search_path TO public`, { transaction: t });
    
    // Update the user record in the public schema
    await db.User.update({ 
      username 
    }, { 
      where: { id: userId },
      transaction: t 
    });
    
    await t.commit();
    
    res.json({ 
      success: true, 
      message: 'Username updated successfully',
      username 
    });
  } catch (error) {
    await t.rollback();
    console.error('Update username error:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

module.exports = router;