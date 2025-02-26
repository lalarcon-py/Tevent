// backend/controllers/guildController.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const crypto = require('crypto');
const db = require('../models');
const schemaManager = require('../utils/schemaManager');

/**
 * Create a new guild
 */
const createGuild = async (req, res) => {
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
    
    // Additional validation for guild name
    if (name.length < 3 || name.length > 50) {
      return res.status(400).json({ 
        error: 'Guild name must be between 3 and 50 characters' 
      });
    }
    
    console.log(`Creating guild "${name}" for user ${req.user.id}`);
    
    // Create guild record with status field
    const guild = await db.Guild.create({
      name: name.trim(),
      owner_id: req.user.id,
      status: 'ACTIVE' // Add a status field to track guild state
    }, { transaction: t });
    
    console.log(`Guild created with ID: ${guild.id}`);
    
    // Create schema for the guild
    try {
      await schemaManager.createGuildSchema(guild.id);
      console.log(`Schema created for guild ${guild.id}`);
    } catch (schemaError) {
      console.error(`Schema creation failed for guild ${guild.id}:`, schemaError);
      throw new Error(`Failed to create guild schema: ${schemaError.message}`);
    }
    
    // Add creator as guild master
    await db.GuildMember.create({
      guild_id: guild.id,
      user_id: req.user.id,
      role: 'Guild Master',
      joined_via_invite: false
    }, { transaction: t });
    
    await t.commit();
    
    res.status(201).json({
      id: guild.id,
      name: guild.name,
      status: guild.status,
      createdAt: guild.created_at || guild.createdAt,
      inviteLink: `${process.env.FRONTEND_URL}/guilds/join/${guild.id}`
    });
  } catch (error) {
    await t.rollback();
    console.error('Guild creation error:', error);
    
    // Provide more specific error messages based on error type
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A guild with this name already exists' });
    }
    
    res.status(500).json({ 
      error: 'Failed to create guild', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Join an existing guild
 */
const joinGuild = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { guildId } = req.params;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if guild exists
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Check if guild is active
    if (guild.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This guild is not active' });
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
      role: 'Member'
    }, { transaction: t });
    
    await t.commit();
    
    res.status(200).json({ 
      message: 'Successfully joined guild',
      guild
    });
  } catch (error) {
    await t.rollback();
    console.error('Join guild error:', error);
    res.status(500).json({ error: 'Failed to join guild' });
  }
};

/**
 * Leave a guild
 */
const leaveGuild = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { guildId } = req.params;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
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
      console.log(`Guild Master ${req.user.id} is leaving guild ${guildId}`);
      
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
        console.log(`Transferring Guild Master role to member ${newOwner.user_id}`);
        // Transfer ownership
        await newOwner.update({ role: 'Guild Master' }, { transaction: t });
        
        // Log the transfer
        if (db.GuildMasterTransfer) {
          await db.GuildMasterTransfer.create({
            old_gm_id: req.user.id,
            new_gm_id: newOwner.user_id,
            guild_id: guildId,
            transferred_at: new Date()
          }, { transaction: t });
        }
      } else {
        console.log(`No members to transfer ownership to. Marking guild for deletion.`);
        // No other members, mark guild for deletion
        await guild.update({ 
          status: 'PENDING_DELETION',
          deletion_scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days grace period
        }, { transaction: t });
      }
    }
    
    // Remove the user from the guild
    await membership.destroy({ transaction: t });
    console.log(`User ${req.user.id} has left guild ${guildId}`);
    
    // Check if guild is now empty
    const remainingMembers = await db.GuildMember.count({
      where: { guild_id: guildId }
    });
    
    if (remainingMembers === 0) {
      console.log(`Guild ${guildId} has no remaining members. Deleting...`);
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
};

/**
 * Helper function to delete empty guilds
 */
const deleteEmptyGuild = async (guildId, transaction) => {
  try {
    // Delete guild record
    await db.Guild.destroy({
      where: { id: guildId },
      transaction
    });
    
    // Drop the guild schema
    await schemaManager.dropGuildSchema(guildId);
    
    console.log(`Guild ${guildId} deleted due to zero members`);
    return true;
  } catch (error) {
    console.error(`Failed to delete empty guild ${guildId}:`, error);
    throw error;
  }
};

/**
 * Transfer guild master role to another member
 */
const transferGuildMaster = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { guildId, newMasterId } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
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
    
    // Update roles
    await currentMaster.update({ role: 'Guild Advisor' }, { transaction: t });
    await newMaster.update({ role: 'Guild Master' }, { transaction: t });
    
    // Log the transfer
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
};

/**
 * Generate an invite code for a guild
 */
const generateInvite = async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if guild exists
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Check if guild is active
    if (guild.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot generate invites for inactive guilds' });
    }
    
    // Check if user has permission to invite
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: {
          [Op.in]: ['Guild Master', 'Guild Advisor']
        }
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'No permission to generate invites' });
    }
    
    // Generate a unique invite code
    const inviteCode = crypto.randomBytes(8).toString('hex');
    
    // Store the invite
    let invite;
    if (db.GuildInvite) {
      invite = await db.GuildInvite.create({
        guild_id: guildId,
        code: inviteCode,
        created_by: req.user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      });
    } else {
      // If GuildInvite model doesn't exist yet, still provide an invite code
      console.warn('GuildInvite model not available - creating ephemeral invite code');
      invite = {
        code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    }
    
    res.status(200).json({
      inviteCode: invite.code,
      inviteUrl: `${process.env.FRONTEND_URL}/guilds/join/invite/${invite.code}`,
      expiresAt: invite.expires_at
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
};

/**
 * Join a guild using an invite code
 */
const joinWithInvite = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { inviteCode } = req.params;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Find the invite
    if (!db.GuildInvite) {
      return res.status(501).json({ error: 'Invite system not implemented' });
    }
    
    const invite = await db.GuildInvite.findOne({
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
    
    // Check if guild exists and is active
    const guild = await db.Guild.findByPk(invite.guild_id);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    if (guild.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot join inactive guild' });
    }
    
    // Check if user is already a member
    const existingMembership = await db.GuildMember.findOne({
      where: {
        guild_id: invite.guild_id,
        user_id: req.user.id
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this guild' });
    }
    
    // Add user to guild
    await db.GuildMember.create({
      guild_id: invite.guild_id,
      user_id: req.user.id,
      role: 'Member',
      joined_via_invite: true,
      invited_by: invite.created_by
    }, { transaction: t });
    
    // Update invite usage count
    await invite.increment('use_count', { transaction: t });
    
    await t.commit();
    
    res.status(200).json({ 
      message: 'Successfully joined guild',
      guildId: invite.guild_id,
      guild
    });
  } catch (error) {
    await t.rollback();
    console.error('Join with invite error:', error);
    res.status(500).json({ error: 'Failed to join guild' });
  }
};

/**
 * Get guild details
 */
const getGuildDetails = async (req, res) => {
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
};

/**
 * Get guild members
 */
const getGuildMembers = async (req, res) => {
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
};

/**
 * Get all guilds for the current user
 */
const getUserGuilds = async (req, res) => {
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
    console.error('Get user guilds error:', error);
    res.status(500).json({ error: 'Failed to fetch user guilds' });
  }
};

/**
 * Get available guilds to join
 */
const getAvailableGuilds = async (req, res) => {
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
        id: { [Op.notIn]: userGuildIds.length > 0 ? userGuildIds : ['00000000-0000-0000-0000-000000000000'] },
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
};

/**
 * Delete a guild
 */
const deleteGuild = async (req, res) => {
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
    
    // Delete all guild members first
    await db.GuildMember.destroy({
      where: { guild_id: guildId },
      transaction: t
    });
    
    // Delete the guild
    await deleteEmptyGuild(guildId, t);
    
    await t.commit();
    
    res.status(200).json({ message: 'Guild deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Delete guild error:', error);
    res.status(500).json({ error: 'Failed to delete guild' });
  }
};

module.exports = {
  createGuild,
  joinGuild,
  leaveGuild,
  transferGuildMaster,
  generateInvite,
  joinWithInvite,
  getGuildDetails,
  getGuildMembers,
  getUserGuilds,
  getAvailableGuilds,
  deleteGuild
};