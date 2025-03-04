// backend/controllers/guildController.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const crypto = require('crypto');
const db = require('../models');
const schemaManager = require('../utils/schemaManager');

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
    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Check if guild is active
    if (guild.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This guild is not active' });
    }
    
    // Check if user is already a member
    const existingMembership = await GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this guild' });
    }
    
    // Add user to guild
    await GuildMember.create({
      guild_id: guildId,
      user_id: req.user.id,
      role: 'Member'
    }, { transaction: t });
    
    // CRITICAL: Copy user data to guild schema
    try {
      console.log(`Copying user ${req.user.id} data to guild schema guild_${guildId}`);
      
      // Get user data from public schema
      const [userData] = await sequelize.query(`
        SELECT * FROM public.users WHERE id = :userId
      `, {
        replacements: { userId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      });
      
      if (userData) {
        // Switch to guild schema
        await sequelize.query(`SET search_path TO "guild_${guildId}"`, { transaction: t });
        
        // Insert user data with all fields
        const fields = Object.keys(userData).join(', ');
        const values = Object.keys(userData).map(key => `:${key}`).join(', ');
        
        await sequelize.query(`
          INSERT INTO users (${fields})
          VALUES (${values})
          ON CONFLICT (id) DO UPDATE
          SET 
            username = :username,
            avatar_url = :avatar_url,
            role = 'Member',
            status = 'Active',
            updated_at = CURRENT_TIMESTAMP
        `, {
          replacements: userData,
          transaction: t
        });
        
        // Reset search path
        await sequelize.query(`SET search_path TO public`, { transaction: t });
        
        console.log(`Successfully copied user ${req.user.id} data to guild schema guild_${guildId}`);
      }
    } catch (copyError) {
      console.error(`Failed to copy user data to guild schema:`, copyError);
      // Continue even if this fails
    }
    
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
    
    console.log(`User ${req.user.id} attempting to leave guild ${guildId}`);
    
    // Check if guild exists
    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Check if user is a member
    const membership = await GuildMember.findOne({
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
      const newOwner = await GuildMember.findOne({
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
        console.log(`No members to transfer ownership to. Guild will be deleted after the user leaves.`);
      }
    }
    
    // Remove the user from the guild
    await membership.destroy({ transaction: t });
    console.log(`User ${req.user.id} has left guild ${guildId}`);
    
    // *** NEW CODE: Delete user data from the guild schema ***
    try {
      console.log(`Deleting user ${req.user.id} data from guild schema guild_${guildId}`);
      
      // Try two methods to ensure data is deleted
      // Method 1: Using model
      try {
        await sequelize.query(`
          SET search_path TO "guild_${guildId}";
          DELETE FROM "guild_${guildId}".users WHERE id = :userId;
          SET search_path TO public;
        `, {
          replacements: { userId: req.user.id },
          transaction: t
        });
      } catch (deleteError) {
        console.error(`Error deleting user with model method:`, deleteError);
        
        // Method 2: Direct SQL
        await sequelize.query(`
          DELETE FROM "guild_${guildId}".users WHERE id = :userId
        `, {
          replacements: { userId: req.user.id },
          transaction: t
        });
      }
      
      console.log(`Successfully deleted user ${req.user.id} data from guild schema guild_${guildId}`);
    } catch (userDeleteError) {
      // Log but continue - we don't want to prevent leaving if this fails
      console.error(`Failed to delete user data from guild schema:`, userDeleteError);
    }
    
    // Check if guild is now empty
    const remainingMembers = await GuildMember.count({
      where: { guild_id: guildId },
      transaction: t  // Use the same transaction to see the updated state
    });
    
    console.log(`Guild ${guildId} has ${remainingMembers} remaining members`);
    
    if (remainingMembers === 0) {
      console.log(`Guild ${guildId} has no remaining members. Deleting immediately...`);
      // Delete the guild and its data
      await deleteEmptyGuild(guildId, t);
      console.log(`Guild ${guildId} and its database have been deleted successfully`);
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
    console.log(`Starting deletion process for empty guild ${guildId}...`);
    
    // Delete guild record
    const deleteResult = await db.Guild.destroy({
      where: { id: guildId },
      transaction
    });
    
    if (deleteResult === 0) {
      throw new Error(`Guild record ${guildId} not found or could not be deleted`);
    }
    
    console.log(`Guild record deleted from database. Now dropping schema...`);
    
    // Drop the guild schema - this is outside the transaction because
    // schema operations can't be rolled back in most databases
    const schemaResult = await schemaManager.dropGuildSchema(guildId);
    
    if (!schemaResult) {
      // Log error but don't throw to prevent transaction rollback
      console.error(`Failed to drop schema for guild ${guildId}, but guild record was deleted`);
    } else {
      console.log(`Schema for guild ${guildId} successfully dropped`);
    }
    
    // Clean up any related data in other tables
    try {
      // These can be within the transaction
      await db.GuildInvite.destroy({
        where: { guild_id: guildId },
        transaction
      });
      
      console.log(`Guild ${guildId} related data cleanup completed`);
    } catch (cleanupError) {
      console.error(`Error during guild ${guildId} cleanup:`, cleanupError);
      // Don't throw this error, just log it
    }
    
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
    
    // Explicitly set search path to public schema for guild membership operations
    await sequelize.query(`SET search_path TO public`);
    
    // Check if user is a member
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });
    
    if (!membership) {
      await sequelize.query(`SET search_path TO public`); // Reset schema
      return res.status(403).json({ error: 'Not a member of this guild' });
    }
    
    // Get all members (still in public schema)
    const members = await db.GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'discord_id', 'builds', 'combat_power']
      }],
      order: [
        // Fix ambiguous column reference by fully qualifying the column
        [sequelize.literal(`CASE 
          WHEN "GuildMember"."role" = 'Guild Master' THEN 1
          WHEN "GuildMember"."role" = 'Guild Advisor' THEN 2
          WHEN "GuildMember"."role" = 'Guild Guardian' THEN 3
          ELSE 4
        END`), 'ASC'],
        ['created_at', 'ASC']
      ]
    });
    
    // Format before switching schemas
    const formattedMembers = members.map(member => ({
      id: member.User.id,
      username: member.User.username,
      avatar_url: member.User.avatar_url,
      discord_id: member.User.discord_id,
      role: member.role,
      builds: member.User.builds,
      combat_power: member.User.combat_power,
      status: member.User.status,
      joinedAt: member.created_at,
      joinedViaInvite: member.joined_via_invite || false
    }));
    
    // Switch to guild schema if needed for the response
    await sequelize.query(`SET search_path TO public`);
    
    res.json(formattedMembers);
  } catch (error) {
    // Always reset schema path on error
    try {
      await sequelize.query(`SET search_path TO public`);
    } catch (e) {
      console.error('Failed to reset schema path:', e);
    }
    
    console.error('Get guild members error:', error);
    res.status(500).json({ error: 'Failed to fetch guild members', details: error.message });
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
    
    console.log('User is member of guilds:', userGuildIds);
    
    // Ensure we handle the case of empty userGuildIds array
    // Without this, if userGuildIds is empty, the query would exclude ALL guilds
    const availableGuilds = await db.Guild.findAll({
      where: {
        ...(userGuildIds.length > 0 ? {
          id: { [Op.notIn]: userGuildIds }
        } : {}),
        status: 'ACTIVE'
      },
      attributes: ['id', 'name', 'created_at']
    });
    
    console.log('Found available guilds:', availableGuilds.length);
    
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