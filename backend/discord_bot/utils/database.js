// backend/discord_bot/utils/database.js
const db = require('../../../models');
const { Op, Sequelize } = require('sequelize');

/**
 * Database utility functions for Discord bot with direct database access
 */
module.exports = {
  /**
   * Get upcoming events for a guild
   */
  getUpcomingEvents: async (guildId, days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + parseInt(days));
    
    return await db.Event.findAll({
      where: {
        guild_id: guildId,
        event_time: {
          [Op.between]: [now, futureDate]
        }
      },
      include: [{
        model: db.EventParticipant,
        as: 'participants',
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'discord_id']
        }]
      }],
      order: [['event_time', 'ASC']]
    });
  },
  
  /**
   * Get specific event by ID
   */
  getEventById: async (eventId) => {
    return await db.Event.findByPk(eventId, {
      include: [{
        model: db.EventParticipant,
        as: 'participants',
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'discord_id']
        }]
      }]
    });
  },
  
  /**
   * Get teams for an event
   */
  getEventTeams: async (eventId) => {
    return await db.Team.findAll({
      where: { event_id: eventId },
      include: [{
        model: db.TeamMember,
        as: 'members',
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'discord_id', 'builds']
        }]
      }],
      order: [['name', 'ASC']]
    });
  },
  
  /**
   * Get a specific team by ID
   */
  getTeamById: async (teamId) => {
    return await db.Team.findByPk(teamId, {
      include: [{
        model: db.TeamMember,
        as: 'members',
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'discord_id', 'builds']
        }]
      }]
    });
  },
  
  /**
   * Get attendance statistics for guild members
   */
  getAttendanceStats: async (guildId, periodDays = 30) => {
    // Calculate period start date
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    
    // Get events in the specified period
    const events = await db.Event.findAll({
      where: {
        guild_id: guildId,
        event_time: {
          [Op.gte]: periodStart,
          [Op.lte]: new Date()
        }
      },
      include: [{
        model: db.EventParticipant,
        as: 'participants',
        attributes: ['id', 'user_id']
      }]
    });
    
    // Get guild members
    const members = await db.GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.User,
        attributes: ['id', 'username']
      }]
    });
    
    // Calculate attendance stats
    const stats = [];
    
    for (const member of members) {
      if (!member.User) continue;
      
      let eventsAttended = 0;
      
      for (const event of events) {
        const attended = event.participants.some(p => p.user_id === member.user_id);
        if (attended) eventsAttended++;
      }
      
      const attendanceRate = events.length > 0 ? 
        (eventsAttended / events.length) * 100 : 0;
      
      stats.push({
        id: member.user_id,
        username: member.User.username,
        events_attended: eventsAttended,
        total_events: events.length,
        attendance_rate: parseFloat(attendanceRate.toFixed(1))
      });
    }
    
    return stats.sort((a, b) => b.attendance_rate - a.attendance_rate);
  },
  
  /**
   * Sign up a user for an event
   */
  signUpForEvent: async (guildId, eventId, discordUserId, role) => {
    const user = await db.User.findOne({
      where: { discord_id: discordUserId }
    });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    const event = await db.Event.findOne({
      where: { id: eventId, guild_id: guildId }
    });
    
    if (!event) {
      return { success: false, message: 'Event not found' };
    }
    
    // Check if user is already signed up
    const existing = await db.EventParticipant.findOne({
      where: {
        event_id: eventId,
        user_id: user.id,
        guild_id: guildId
      }
    });
    
    if (existing) {
      // Update role if already signed up
      await existing.update({ role });
      return { success: true, message: 'Role updated' };
    }
    
    // Check if role is full
    const participants = await db.EventParticipant.findAll({
      where: { 
        event_id: eventId,
        role,
        guild_id: guildId
      }
    });
    
    const roleLimits = {
      'TANK': event.tanks || 0,
      'HEALER': event.healers || 0,
      'DPS': event.dps || 0
    };
    
    if (participants.length >= roleLimits[role]) {
      return { success: false, message: `${role} slots are full` };
    }
    
    // Create new signup
    await db.EventParticipant.create({
      event_id: eventId,
      user_id: user.id,
      guild_id: guildId,
      role
    });
    
    return { success: true };
  },
  
  /**
   * Get guild ID from Discord server ID
   */
  getGuildIdFromDiscord: async (discordServerId) => {
    try {
      console.log(`Checking mapping for Discord guild: ${discordServerId}`);
      
      // Use direct database query with parameterized query
      const [result] = await sequelize.query(
        `SELECT app_guild_id FROM discord_guild_mappings 
         WHERE discord_guild_id = $1`,
        { 
          bind: [discordServerId.toString()],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!result) {
        console.log(`No mapping found for Discord guild ID: ${discordServerId}`);
        return null;
      }
      
      console.log(`Mapping found: ${result.app_guild_id}`);
      return result.app_guild_id;
    } catch (error) {
      console.error('Error getting guild ID from Discord server ID:', error);
      throw error;
    }
  },
  
  /**
   * Get members with their roles
   */
  getMembers: async (guildId) => {
    return await db.GuildMember.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'discord_id', 'builds', 'combat_power']
      }]
    });
  },

  /**
   * Update event attendance
   */
  updateEventAttendance: async (eventId, userId, attended) => {
    // Get the event first to check guild_id
    const event = await db.Event.findByPk(eventId, {
      attributes: ['id', 'guild_id']
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    if (attended) {
      // If marking as attended, create or ensure a participant record exists
      const [participant, created] = await db.EventParticipant.findOrCreate({
        where: { 
          event_id: eventId,
          user_id: userId,
          guild_id: event.guild_id
        },
        defaults: {
          role: 'ATTENDEE' // Default role if not specified
        }
      });
      
      // Remove from absentees if table exists
      if (db.EventAbsentee) {
        try {
          await db.EventAbsentee.destroy({
            where: {
              event_id: eventId,
              user_id: userId,
              guild_id: event.guild_id
            }
          });
        } catch (error) {
          console.warn('Failed to remove from absentees:', error.message);
        }
      }
    } else {
      // If marking as absent, remove participant record if it exists
      await db.EventParticipant.destroy({
        where: { 
          event_id: eventId,
          user_id: userId,
          guild_id: event.guild_id
        }
      });
      
      // Create absence record if table exists
      if (db.EventAbsentee) {
        try {
          await db.EventAbsentee.findOrCreate({
            where: {
              event_id: eventId,
              user_id: userId,
              guild_id: event.guild_id
            }
          });
        } catch (error) {
          console.warn('Failed to add to absentees:', error.message);
        }
      }
    }
    
    return { success: true };
  },
  
  /**
   * Get items in guild storage
   */
  getGuildStorageItems: async (guildId) => {
    return await db.GuildStorageItem.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.Item,
        attributes: ['id', 'name', 'type', 'icon']
      }]
    });
  },
  
  /**
   * Get pending loot requests
   */
  getLootRequests: async (guildId) => {
    return await db.LootRequest.findAll({
      where: { 
        guild_id: guildId,
        status: 'Pending'
      },
      include: [
        {
          model: db.GuildStorageItem,
          as: 'storageItem',
          include: [{
            model: db.Item,
            attributes: ['id', 'name', 'type', 'icon']
          }]
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'username', 'discord_id']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  },
  
  /**
   * Approve a loot request
   */
  approveLootRequest: async (guildId, requestId) => {
    const t = await db.sequelize.transaction();
    
    try {
      const request = await db.LootRequest.findOne({
        where: { 
          id: requestId,
          guild_id: guildId
        },
        include: [
          {
            model: db.GuildStorageItem,
            as: 'storageItem',
            include: [db.Item]
          },
          {
            model: db.User,
            as: 'user'
          }
        ],
        transaction: t
      });
      
      if (!request) {
        await t.rollback();
        return { success: false, message: 'Request not found' };
      }
      
      // Check if item is still available
      if (!request.storageItem || request.storageItem.quantity < 1) {
        await t.rollback();
        return { success: false, message: 'Item no longer available in storage' };
      }
      
      // Update request status
      await request.update({ status: 'Approved' }, { transaction: t });
      
      // Decrement quantity
      await request.storageItem.decrement('quantity', { transaction: t });
      
      await t.commit();
      
      return { 
        success: true,
        userId: request.user?.id,
        username: request.user?.username || 'Unknown',
        discordId: request.user?.discord_id,
        itemName: request.storageItem?.Item?.name || 'Unknown Item'
      };
    } catch (error) {
      await t.rollback();
      console.error('Error approving loot request:', error);
      throw error;
    }
  },
  
  /**
   * Deny a loot request
   */
  denyLootRequest: async (guildId, requestId) => {
    try {
      const request = await db.LootRequest.findOne({
        where: { 
          id: requestId,
          guild_id: guildId
        },
        include: [
          {
            model: db.GuildStorageItem,
            as: 'storageItem',
            include: [db.Item]
          },
          {
            model: db.User,
            as: 'user'
          }
        ]
      });
      
      if (!request) {
        return { success: false, message: 'Request not found' };
      }
      
      // Update request status
      await request.update({ status: 'Denied' });
      
      return { 
        success: true,
        userId: request.user?.id,
        username: request.user?.username || 'Unknown',
        discordId: request.user?.discord_id,
        itemName: request.storageItem?.Item?.name || 'Unknown Item'
      };
    } catch (error) {
      console.error('Error denying loot request:', error);
      throw error;
    }
  },
  
  /**
   * Create a loot request
   */
  createLootRequest: async (guildId, itemId, discordUserId) => {
    try {
      const user = await db.User.findOne({
        where: { discord_id: discordUserId }
      });
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      const storageItem = await db.GuildStorageItem.findOne({
        where: { 
          id: itemId,
          guild_id: guildId
        },
        include: [db.Item]
      });
      
      if (!storageItem) {
        return { success: false, message: 'Item not found in storage' };
      }
      
      // Check if user already has a pending request for this item
      const existingRequest = await db.LootRequest.findOne({
        where: {
          storage_item_id: itemId,
          user_id: user.id,
          guild_id: guildId,
          status: 'Pending'
        }
      });
      
      if (existingRequest) {
        return { success: false, message: 'You already have a pending request for this item' };
      }
      
      // Create new request
      const request = await db.LootRequest.create({
        storage_item_id: itemId,
        user_id: user.id,
        guild_id: guildId,
        status: 'Pending'
      });
      
      return { 
        success: true,
        requestId: request.id,
        itemName: storageItem.Item?.name || 'Unknown Item'
      };
    } catch (error) {
      console.error('Error creating loot request:', error);
      throw error;
    }
  },
  
  /**
   * Get a user by Discord ID
   */
  getUserByDiscordId: async (discordId) => {
    return await db.User.findOne({
      where: { discord_id: discordId },
      attributes: ['id', 'username', 'discord_id']
    });
  }
};