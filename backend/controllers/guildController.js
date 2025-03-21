// backend/controllers/guildController.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const crypto = require('crypto');
const db = require('../models');
const schemaManager = require('../utils/schemaManager');
const { updateUserRoleAfterGuildLeave } = require('../utils/roleManager');

const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const regenerateJoinCode = async (req, res) => {
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
      return res.status(403).json({ error: 'Only the Guild Master can regenerate the join code' });
    }
    
    // Generate a new join code
    const newJoinCode = generateRandomCode();
    
    // Update the guild
    await db.Guild.update(
      { join_code: newJoinCode },
      { where: { id: guildId } }
    );
    
    res.json({ joinCode: newJoinCode });
  } catch (error) {
    console.error('Regenerate join code error:', error);
    res.status(500).json({ error: 'Failed to regenerate join code' });
  }
};

const createGuild = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description, isPrivate, joinCode } = req.body;
    const userId = req.user.id;
    
    // Validate inputs
    if (!name || name.length < 3 || name.length > 50) {
      return res.status(400).json({ error: 'Guild name must be between 3 and 50 characters' });
    }
    
    // Generate a unique join code if not provided
    const finalJoinCode = joinCode || generateUniqueJoinCode();
    
    // Create the guild
    const guild = await db.Guild.create({
      name,
      description,
      private_guild: isPrivate || false,
      owner_id: userId,
      join_code: finalJoinCode,
      status: 'ACTIVE'
    }, { transaction: t });
    
    // Add user as Guild Master in guild_members
    await db.GuildMember.create({
      guild_id: guild.id,
      user_id: userId,
      role: 'Guild Master'
    }, { transaction: t });
    
    // IMPORTANT: Also update the user's global role in the users table
    // This ensures consistency between the two tables
    await db.User.update(
      { role: 'Guild Master' },
      { 
        where: { id: userId },
        transaction: t 
      }
    );
    
    // Log the guild creation
    await db.AdminLog.create({
      admin_id: userId,
      action: 'CREATE_GUILD',
      details: { guildName: name },
      target_type: 'guild',
      target_id: guild.id
    }, { transaction: t });
    
    await t.commit();
    
    // Update the session user object with new role
    req.user.role = 'Guild Master';
    
    res.status(201).json({
      success: true,
      guild: {
        id: guild.id,
        name: guild.name,
        joinCode: guild.join_code
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Guild creation error:', error);
    res.status(500).json({ error: 'Failed to create guild', details: error.message });
  }
};

const generateUniqueJoinCode = () => {
  // Generate a random 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Join an existing guild
 */
const joinGuild = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { guildId } = req.params;
    const { joinCode } = req.body; // Get the join code from the request
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if guild exists
    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      await t.rollback();
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Verify join code
    if (guild.join_code !== joinCode) {
      await t.rollback();
      return res.status(403).json({ error: 'Invalid join code' });
    }
    
    // Check if guild is active
    if (guild.status !== 'ACTIVE') {
      await t.rollback();
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
      await t.rollback();
      return res.status(400).json({ error: 'Already a member of this guild' });
    }
    
    // Add user to guild
    await GuildMember.create({
      guild_id: guildId,
      user_id: req.user.id,
      role: 'Guild Member'
    }, { transaction: t });
    
    // CRITICAL: Create user record with guild_id
    try {
      
      // Get user data from public users table
      const [userData] = await sequelize.query(`
        SELECT * FROM public.users WHERE id = :userId
      `, {
        replacements: { userId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      });
      
      if (userData) {
        // Create user with guild_id
        await db.User.create({
          ...userData,
          id: userData.id,  // Keep same ID
          guild_id: guildId,
          role: 'Guild Member',
          status: 'Active'
        }, { transaction: t });
        
      }
    } catch (copyError) {
      console.error(`Failed to create user data with guild_id:`, copyError);
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

const leaveGuild = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { guildId } = req.params;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if guild exists
    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      await t.rollback();
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
      await t.rollback();
      return res.status(404).json({ error: 'Not a member of this guild' });
    }
    
    // Check if user is the guild master
    if (membership.role === 'Guild Master') {
      
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
        // No other members to transfer to
      }
    }
    
    // Remove the user from the guild
    await membership.destroy({ transaction: t });
    
    // Check for remaining guild memberships
    const remainingMemberships = await GuildMember.findAll({
      where: { user_id: req.user.id },
      transaction: t
    });
    
    // Log the number of remaining memberships
    console.log(`User ${req.user.id} has ${remainingMemberships.length} remaining guild memberships`);
    
    // If no remaining guild memberships, DELETE the user from the users table to ensure
    // they don't retain elevated permissions
    if (remainingMemberships.length === 0) {
      console.log(`User ${req.user.id} has no remaining guild memberships - deleting from users table`);
      
      // CRITICAL SECURITY FIX: Delete the user record to remove all roles
      await db.User.destroy({
        where: { 
          id: req.user.id,
          // Only delete global records with no guild_id or with this specific guild_id
          [Op.or]: [
            { guild_id: null },
            { guild_id: guildId }
          ]
        },
        transaction: t
      });
      
      console.log(`User ${req.user.id} deleted from users table`);
    } else {
      // User still has other guild memberships
      // Find the highest remaining role
      let highestRole = 'Member'; // Default if no memberships remain
      
      const roleHierarchy = {
        'Guild Master': 4,
        'Guild Advisor': 3,
        'Guild Guardian': 2,
        'Guild Member': 1,
        'Member': 1
      };
      
      for (const m of remainingMemberships) {
        const roleRank = roleHierarchy[m.role] || 0;
        if (roleRank > roleHierarchy[highestRole]) {
          highestRole = m.role;
        }
      }
      
      // Update the user's role based on their remaining guild memberships
      console.log(`Updating user ${req.user.id} role to ${highestRole} based on remaining memberships`);
      
      await db.User.update(
        { role: highestRole },
        { 
          where: { 
            id: req.user.id,
            guild_id: null // Only update the global record
          },
          transaction: t 
        }
      );
    }
    
    // Delete guild-specific user data
    try {
      // Delete guild-specific user record
      await db.User.destroy({
        where: { 
          id: req.user.id,
          guild_id: guildId
        },
        transaction: t
      });
      
      // Also clean up other related data
      await db.EventParticipant.destroy({
        where: { 
          user_id: req.user.id,
          guild_id: guildId
        },
        transaction: t
      });
      
      await db.TeamMember.destroy({
        where: { 
          user_id: req.user.id,
          guild_id: guildId
        },
        transaction: t
      });
      
      if (db.WishList) {
        await db.WishList.destroy({
          where: { 
            user_id: req.user.id,
            guild_id: guildId
          },
          transaction: t
        });
      }
      
    } catch (userDeleteError) {
      console.error(`Failed to delete user data for guild:`, userDeleteError);
      throw userDeleteError; // Rethrow to force transaction rollback
    }
    
    // Check if guild is now empty
    const remainingMembers = await GuildMember.count({
      where: { guild_id: guildId },
      transaction: t  // Use the same transaction to see the updated state
    });

    if (remainingMembers === 0) {
      await deleteEmptyGuild(guildId, t);
    }
    
    await t.commit();
    
    // Force user logout if they were deleted from the users table
    if (remainingMemberships.length === 0) {
      // Clear session
      req.logout(err => {
        if (err) {
          console.error('Logout error after user deletion:', err);
        }
      });
    }
    
    res.status(200).json({ 
      message: 'Successfully left guild',
      userDeleted: remainingMemberships.length === 0
    });
  } catch (error) {
    await t.rollback();
    console.error('Leave guild error:', error);
    res.status(500).json({ error: 'Failed to leave guild' });
  }
};

const deleteEmptyGuild = async (guildId, transaction) => {
  try {
    
    // Delete guild record
    const deleteResult = await db.Guild.destroy({
      where: { id: guildId },
      transaction
    });
    
    if (deleteResult === 0) {
      throw new Error(`Guild record ${guildId} not found or could not be deleted`);
    }
    
    // Delete all guild data by guild_id
    await db.User.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.Event.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.EventParticipant.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.Team.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.TeamMember.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.Item.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.GuildStorageItem.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    await db.LootRequest.destroy({ 
      where: { guild_id: guildId }, 
      transaction 
    });
    
    if (db.WishList) {
      await db.WishList.destroy({ 
        where: { guild_id: guildId }, 
        transaction 
      });
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
    
    // Update roles in guild_members table
    await currentMaster.update({ role: 'Guild Advisor' }, { transaction: t });
    await newMaster.update({ role: 'Guild Master' }, { transaction: t });
    
    // Update roles in main users table
    try {
      // Import the role manager utility
      const { updateUserRoleAfterGuildLeave } = require('../utils/roleManager');
      
      // Update roles in main user table for both users
      await updateUserRoleAfterGuildLeave(req.user.id);
      await updateUserRoleAfterGuildLeave(newMasterId);
    } catch (roleUpdateError) {
      console.error('Failed to update user roles after transfer:', roleUpdateError);
      // Continue despite error to ensure the transfer still works
    }
    
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
      role: 'Guild Member',
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
    
    // Get all members with guild_id filter
    const members = await db.GuildMember.findAll({
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
    
    // Format the response
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
    
    res.json(formattedMembers);
  } catch (error) {
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