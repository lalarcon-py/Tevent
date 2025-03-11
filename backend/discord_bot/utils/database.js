const { Event, User, EventParticipant, Team, TeamMember, Guild, GuildMember, Item, LootRequest, GuildStorageItem } = require('../../../models');
const { Op, Sequelize } = require('sequelize');

/**
 * Database utility functions for Discord bot
 */
module.exports = {
  /**
   * Get upcoming events for a guild
   */
  getUpcomingEvents: async (guildId, days = 7) => {
    // SECURITY FIX: Validate inputs
    if (!guildId) {
      throw new Error('Guild ID is required');
    }
    
    if (!Number.isInteger(parseInt(days)) || days <= 0 || days > 30) {
      days = 7; // Default to 7 if invalid
    }
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + parseInt(days));
    
    // SECURITY FIX: Limit data retrieval to only necessary fields
    return await Event.findAll({
      where: {
        guild_id: guildId,
        event_time: {
          [Op.between]: [now, futureDate]
        }
      },
      attributes: ['id', 'title', 'description', 'event_time', 'location', 'tanks', 'healers', 'dps'],
      include: [{
        model: EventParticipant,
        as: 'participants',
        attributes: ['id', 'role', 'user_id'],
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id'] // Limit exposed user data
        }]
      }],
      order: [['event_time', 'ASC']]
    });
  },
  
  /**
   * Get specific event by ID
   */
  getEventById: async (eventId) => {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    return await Event.findByPk(eventId, {
      attributes: ['id', 'title', 'description', 'event_time', 'location', 'tanks', 'healers', 'dps', 'guild_id'],
      include: [{
        model: EventParticipant,
        as: 'participants',
        attributes: ['id', 'role', 'user_id'],
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id']
        }]
      }]
    });
  },
  
  /**
   * Get teams for an event
   */
  getEventTeams: async (eventId) => {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    return await Team.findAll({
      where: { event_id: eventId },
      attributes: ['id', 'name', 'event_id', 'guild_id'],
      include: [{
        model: TeamMember,
        as: 'members',
        attributes: ['id', 'role', 'position'],
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id']
        }]
      }],
      order: [['name', 'ASC']]
    });
  },
  
  /**
   * Get a specific team by ID
   */
  getTeamById: async (teamId) => {
    if (!teamId) {
      throw new Error('Team ID is required');
    }
    
    return await Team.findByPk(teamId, {
      attributes: ['id', 'name', 'event_id', 'guild_id'],
      include: [{
        model: TeamMember,
        as: 'members',
        attributes: ['id', 'role', 'position'],
        include: [{
          model: User,
          attributes: ['id', 'username', 'discord_id']
        }]
      }]
    });
  },
  
  /**
   * Get attendance statistics for guild members
   */
  getAttendanceStats: async (guildId, periodDays = 30) => {
    if (!guildId) {
      throw new Error('Guild ID is required');
    }
    
    // Sanitize input
    if (!Number.isInteger(parseInt(periodDays)) || periodDays <= 0 || periodDays > 90) {
      periodDays = 30;
    }
    
    try {
      // Calculate period start date
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);
      
      // Get events in the specified period
      const events = await Event.findAll({
        where: {
          guild_id: guildId,
          event_time: {
            [Op.gte]: periodStart,
            [Op.lte]: new Date()
          }
        },
        attributes: ['id', 'title', 'event_time'],
        include: [{
          model: EventParticipant,
          as: 'participants',
          attributes: ['id', 'user_id']
        }]
      });
      
      if (!events || events.length === 0) {
        return []; // No events found
      }
      
      // Get all members in guild
      const members = await GuildMember.findAll({
        where: { guild_id: guildId },
        attributes: ['id', 'user_id'],
        include: [{
          model: User,
          attributes: ['id', 'username']
        }]
      });
      
      // Calculate attendance for each member
      const memberStats = [];
      
      for (const member of members) {
        if (!member.User) continue;
        
        let eventsAttended = 0;
        
        for (const event of events) {
          const attended = event.participants.some(p => p.user_id === member.user_id);
          if (attended) eventsAttended++;
        }
        
        const attendanceRate = events.length > 0 ? 
          (eventsAttended / events.length) * 100 : 0;
        
        memberStats.push({
          id: member.user_id,
          username: member.User.username,
          events_attended: eventsAttended,
          total_events: events.length,
          attendance_rate: parseFloat(attendanceRate.toFixed(1))
        });
      }
      
      // Sort by attendance rate (descending)
      return memberStats.sort((a, b) => b.attendance_rate - a.attendance_rate);
    } catch (error) {
      console.error('Error calculating attendance stats:', error);
      throw error;
    }
  },
  
  /**
   * Sign up a user for an event
   */
  signUpForEvent: async (guildId, eventId, discordUserId, role) => {
    if (!guildId || !eventId || !discordUserId || !role) {
      throw new Error('Missing required parameters');
    }
    
    const user = await User.findOne({
      where: { discord_id: discordUserId }
    });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    const event = await Event.findOne({
      where: { id: eventId, guild_id: guildId }
    });
    
    if (!event) {
      return { success: false, message: 'Event not found' };
    }
    
    // Check if user is already signed up
    const existing = await EventParticipant.findOne({
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
    const participants = await EventParticipant.findAll({
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
    await EventParticipant.create({
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
    if (!discordServerId) {
      throw new Error('Discord server ID is required');
    }
    
    try {
      // SECURITY FIX: Use parameterized query
      const [result] = await Sequelize.query(
        `SELECT app_guild_id FROM discord_guild_mappings 
         WHERE discord_guild_id = ?`,
        { 
          replacements: [discordServerId.toString()],
          type: Sequelize.QueryTypes.SELECT
        }
      );
      
      return result ? result.app_guild_id : null;
    } catch (error) {
      console.error('Error getting guild ID from Discord server ID:', error);
      throw error;
    }
  },
  
  /**
   * Get members with their roles
   */
  getMembers: async (guildId) => {
    if (!guildId) {
      throw new Error('Guild ID is required');
    }
    
    return await GuildMember.findAll({
      where: { guild_id: guildId },
      attributes: ['id', 'role', 'user_id'],
      include: [{
        model: User,
        attributes: ['id', 'username', 'discord_id']
      }]
    });
  },

  /**
   * Update event attendance
   */
  updateEventAttendance: async (eventId, userId, attended) => {
    if (!eventId || !userId) {
      throw new Error('Event ID and User ID are required');
    }
    
    try {
      // Get the event first to check guild_id
      const event = await Event.findByPk(eventId, {
        attributes: ['id', 'guild_id']
      });
      
      if (!event) {
        throw new Error('Event not found');
      }
      
      if (attended) {
        // If marking as attended, create or ensure a participant record exists
        const [participant, created] = await EventParticipant.findOrCreate({
          where: { 
            event_id: eventId,
            user_id: userId,
            guild_id: event.guild_id
          },
          defaults: {
            role: 'ATTENDEE' // Default role if not specified
          }
        });
        
        // Remove from absentees if exists
        try {
          await EventAbsentee.destroy({
            where: {
              event_id: eventId,
              user_id: userId,
              guild_id: event.guild_id
            }
          });
        } catch (error) {
          // EventAbsentee table might not exist, so catch and ignore
          console.warn('Failed to remove from absentees (table might not exist)');
        }
      } else {
        // If marking as absent, remove participant record if it exists
        await EventParticipant.destroy({
          where: { 
            event_id: eventId,
            user_id: userId,
            guild_id: event.guild_id
          }
        });
        
        // Create absence record if you have such a table
        try {
          await EventAbsentee.findOrCreate({
            where: {
              event_id: eventId,
              user_id: userId,
              guild_id: event.guild_id
            }
          });
        } catch (error) {
          // EventAbsentee table might not exist, so catch and ignore
          console.warn('Failed to add to absentees (table might not exist)');
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating event attendance:', error);
      throw error;
    }
  },
  
  /**
   * Get items in guild storage
   */
  getGuildStorageItems: async (guildId) => {
    if (!guildId) {
      throw new Error('Guild ID is required');
    }
    
    try {
      return await GuildStorageItem.findAll({
        where: { guild_id: guildId },
        attributes: ['id', 'item_id', 'quantity', 'trait', 'dkp_cost'],
        include: [{
          model: Item,
          attributes: ['id', 'name', 'type', 'icon']
        }]
      });
    } catch (error) {
      console.error('Error getting guild storage items:', error);
      throw error;
    }
  },
  
  /**
   * Get pending loot requests
   */
  getLootRequests: async (guildId) => {
    if (!guildId) {
      throw new Error('Guild ID is required');
    }
    
    try {
      return await LootRequest.findAll({
        where: { 
          guild_id: guildId,
          status: 'Pending'
        },
        attributes: ['id', 'storage_item_id', 'user_id', 'status', 'created_at', 'priority'],
        include: [
          {
            model: GuildStorageItem,
            as: 'storageItem',
            attributes: ['id', 'item_id', 'quantity', 'trait', 'dkp_cost'],
            include: [{
              model: Item,
              attributes: ['id', 'name', 'type', 'icon']
            }]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'discord_id']
          }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting loot requests:', error);
      throw error;
    }
  },
  
  /**
   * Approve a loot request
   */
  approveLootRequest: async (guildId, requestId) => {
    if (!guildId || !requestId) {
      throw new Error('Guild ID and Request ID are required');
    }
    
    const t = await Sequelize.transaction();
    
    try {
      const request = await LootRequest.findOne({
        where: { 
          id: requestId,
          guild_id: guildId
        },
        include: [
          {
            model: GuildStorageItem,
            as: 'storageItem',
            include: [Item]
          },
          {
            model: User,
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
    if (!guildId || !requestId) {
      throw new Error('Guild ID and Request ID are required');
    }
    
    try {
      const request = await LootRequest.findOne({
        where: { 
          id: requestId,
          guild_id: guildId
        },
        include: [
          {
            model: GuildStorageItem,
            as: 'storageItem',
            include: [Item]
          },
          {
            model: User,
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
    if (!guildId || !itemId || !discordUserId) {
      throw new Error('Guild ID, Item ID, and Discord User ID are required');
    }
    
    try {
      const user = await User.findOne({
        where: { discord_id: discordUserId }
      });
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      const storageItem = await GuildStorageItem.findOne({
        where: { 
          id: itemId,
          guild_id: guildId
        },
        include: [Item]
      });
      
      if (!storageItem) {
        return { success: false, message: 'Item not found in storage' };
      }
      
      // Check if user already has a pending request for this item
      const existingRequest = await LootRequest.findOne({
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
      const request = await LootRequest.create({
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
    if (!discordId) {
      throw new Error('Discord ID is required');
    }
    
    try {
      return await User.findOne({
        where: { discord_id: discordId },
        attributes: ['id', 'username', 'discord_id']
      });
    } catch (error) {
      console.error('Error getting user by Discord ID:', error);
      throw error;
    }
  }
};