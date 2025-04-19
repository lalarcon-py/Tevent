// backend/utils/debugFunctions.js
const { Guild, GuildMember, User } = require('../models');

// Function to check guild membership status
const checkGuildMembership = async (userId, guildId) => {
  if (!userId || !guildId) {
    return { 
      error: 'Missing parameters',
      success: false,
      details: 'Both userId and guildId are required'
    };
  }
  
  try {
    // Check if guild exists
    const guild = await Guild.findByPk(guildId);
    
    if (!guild) {
      return { 
        error: 'Guild not found',
        success: false,
        details: `No guild found with ID: ${guildId}`
      };
    }
    
    // Check if user exists
    const user = await User.findByPk(userId);
    
    if (!user) {
      return { 
        error: 'User not found',
        success: false,
        details: `No user found with ID: ${userId}`
      };
    }
    
    // Check membership
    const membership = await GuildMember.findOne({
      where: {
        user_id: userId,
        guild_id: guildId
      }
    });
    
    if (!membership) {
      return {
        success: false,
        error: 'Not a guild member',
        details: `User ${userId} is not a member of guild ${guildId}`,
        user: {
          id: user.id,
          username: user.username
        },
        guild: {
          id: guild.id,
          name: guild.name
        }
      };
    }
    
    return {
      success: true,
      membership: {
        userId: membership.user_id,
        guildId: membership.guild_id,
        role: membership.role,
        joinedAt: membership.created_at
      },
      user: {
        id: user.id,
        username: user.username
      },
      guild: {
        id: guild.id,
        name: guild.name,
        status: guild.status
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Database error',
      details: error.message
    };
  }
};

// Function to fix guild membership issues
const repairGuildMembership = async (userId, guildId, role = 'Guild Master') => {
  if (!userId || !guildId) {
    return { 
      error: 'Missing parameters',
      success: false,
      details: 'Both userId and guildId are required'
    };
  }
  
  try {
    // Check if user and guild exist
    const guild = await Guild.findByPk(guildId);
    const user = await User.findByPk(userId);
    
    if (!guild || !user) {
      return { 
        error: 'Entity not found',
        success: false,
        details: !guild ? `No guild found with ID: ${guildId}` : `No user found with ID: ${userId}`
      };
    }
    
    // Check if membership already exists
    const existingMembership = await GuildMember.findOne({
      where: {
        user_id: userId,
        guild_id: guildId
      }
    });
    
    if (existingMembership) {
      // Update role if needed
      if (existingMembership.role !== role) {
        await existingMembership.update({ role });
        return {
          success: true,
          message: 'Membership role updated',
          membership: {
            userId,
            guildId,
            role,
            updatedAt: new Date()
          }
        };
      } else {
        return {
          success: true,
          message: 'Membership already exists with correct role',
          membership: {
            userId,
            guildId,
            role: existingMembership.role,
            createdAt: existingMembership.created_at
          }
        };
      }
    }
    
    // Create new membership
    const newMembership = await GuildMember.create({
      user_id: userId,
      guild_id: guildId,
      role,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return {
      success: true,
      message: 'Membership created successfully',
      membership: {
        userId,
        guildId,
        role,
        createdAt: newMembership.created_at
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Database error',
      details: error.message
    };
  }
};

module.exports = {
  checkGuildMembership,
  repairGuildMembership
};