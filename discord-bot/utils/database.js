// backend/discord_bot/utils/database.js
const db = require('../../../models');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../../../config/database');

/**
 * Database utility functions for Discord bot with direct database access
 */
module.exports = {
  /**
   * Get upcoming events for a guild
   */
  getUpcomingEvents: async (guildId, days = 7) => {
    console.log(`[DEBUG] getUpcomingEvents called with guildId: ${guildId}, days: ${days}`);
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + parseInt(days));
      
      console.log(`[DEBUG] Querying events between ${now.toISOString()} and ${futureDate.toISOString()}`);
      
      // Test database connection
      try {
        await sequelize.query('SELECT 1');
        console.log(`[DEBUG] Database connection verified before getUpcomingEvents query`);
      } catch (connError) {
        console.error(`[ERROR] Database connection test failed in getUpcomingEvents: ${connError.message}`);
      }
      
      const events = await db.Event.findAll({
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
      
      console.log(`[DEBUG] Found ${events.length} upcoming events`);
      return events;
    } catch (error) {
      console.error(`[ERROR] getUpcomingEvents failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get specific event by ID
   */
  getEventById: async (eventId) => {
    console.log(`[DEBUG] getEventById called with eventId: ${eventId}`);
    try {
      const event = await db.Event.findByPk(eventId, {
        include: [{
          model: db.EventParticipant,
          as: 'participants',
          include: [{
            model: db.User,
            attributes: ['id', 'username', 'discord_id']
          }]
        }]
      });
      
      console.log(`[DEBUG] Event found: ${event ? 'Yes' : 'No'}`);
      return event;
    } catch (error) {
      console.error(`[ERROR] getEventById failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get guild ID from Discord server ID
   */
  getGuildIdFromDiscord: async (discordServerId) => {
    console.log(`[DEBUG] getGuildIdFromDiscord called with discordServerId: ${discordServerId}`);
    try {
      console.log(`[DEBUG] Attempting database query for Discord mapping: ${discordServerId}`);
      
      // Log the exact SQL query we're about to execute
      const query = `SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = '${discordServerId}'`;
      console.log(`[DEBUG] Executing query: ${query}`);
      
      // First try a basic query to check connectivity
      try {
        const testResult = await sequelize.query('SELECT NOW() as time');
        console.log(`[DEBUG] Basic connectivity test: ${JSON.stringify(testResult[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Basic connectivity test failed: ${testError.message}`);
      }
      
      const [result] = await sequelize.query(
        `SELECT app_guild_id FROM discord_guild_mappings 
         WHERE discord_guild_id = $1`,
        { 
          bind: [discordServerId.toString()],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      console.log(`[DEBUG] Query result for Discord mapping: ${JSON.stringify(result)}`);
      
      if (!result) {
        console.log(`[DEBUG] No mapping found for Discord guild ID: ${discordServerId}`);
        return null;
      }
      
      console.log(`[DEBUG] Mapping found, returning app_guild_id: ${result.app_guild_id}`);
      return result.app_guild_id;
    } catch (error) {
      console.error(`[ERROR] getGuildIdFromDiscord failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get teams for an event
   */
  getEventTeams: async (eventId) => {
    console.log(`[DEBUG] getEventTeams called with eventId: ${eventId}`);
    try {
      const teams = await db.Team.findAll({
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
      
      console.log(`[DEBUG] Found ${teams.length} teams for event ${eventId}`);
      return teams;
    } catch (error) {
      console.error(`[ERROR] getEventTeams failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get a specific team by ID
   */
  getTeamById: async (teamId) => {
    console.log(`[DEBUG] getTeamById called with teamId: ${teamId}`);
    try {
      const team = await db.Team.findByPk(teamId, {
        include: [{
          model: db.TeamMember,
          as: 'members',
          include: [{
            model: db.User,
            attributes: ['id', 'username', 'discord_id', 'builds']
          }]
        }]
      });
      
      console.log(`[DEBUG] Team found: ${team ? 'Yes' : 'No'}`);
      return team;
    } catch (error) {
      console.error(`[ERROR] getTeamById failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get attendance statistics for guild members
   */
  getAttendanceStats: async (guildId, periodDays = 30) => {
    console.log(`[DEBUG] getAttendanceStats called with guildId: ${guildId}, periodDays: ${periodDays}`);
    try {
      // Calculate period start date
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);
      
      console.log(`[DEBUG] Calculating attendance since ${periodStart.toISOString()}`);
      
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
      
      console.log(`[DEBUG] Found ${events.length} events in the period`);
      
      // Get guild members
      const members = await db.GuildMember.findAll({
        where: { guild_id: guildId },
        include: [{
          model: db.User,
          attributes: ['id', 'username']
        }]
      });
      
      console.log(`[DEBUG] Found ${members.length} guild members`);
      
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
      
      console.log(`[DEBUG] Calculated attendance stats for ${stats.length} members`);
      return stats.sort((a, b) => b.attendance_rate - a.attendance_rate);
    } catch (error) {
      console.error(`[ERROR] getAttendanceStats failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Sign up a user for an event
   */
  signUpForEvent: async (guildId, eventId, discordUserId, role) => {
    console.log(`[DEBUG] signUpForEvent called with guildId: ${guildId}, eventId: ${eventId}, discordUserId: ${discordUserId}, role: ${role}`);
    try {
      const user = await db.User.findOne({
        where: { discord_id: discordUserId }
      });
      
      if (!user) {
        console.log(`[DEBUG] User not found for Discord ID: ${discordUserId}`);
        return { success: false, message: 'User not found' };
      }
      
      console.log(`[DEBUG] Found user: ${user.id}`);
      
      // Check if event exists
      const event = await db.Event.findOne({
        where: { id: eventId, guild_id: guildId }
      });
      
      if (!event) {
        console.log(`[DEBUG] Event not found: ${eventId}`);
        return { success: false, message: 'Event not found' };
      }
      
      console.log(`[DEBUG] Found event: ${event.id}`);
      
      // Check if user is already signed up
      const existing = await db.EventParticipant.findOne({
        where: {
          event_id: eventId,
          user_id: user.id,
          guild_id: guildId
        }
      });
      
      if (existing) {
        console.log(`[DEBUG] User already signed up, updating role from ${existing.role} to ${role}`);
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
        console.log(`[DEBUG] Role ${role} is full: ${participants.length}/${roleLimits[role]}`);
        return { success: false, message: `${role} slots are full` };
      }
      
      console.log(`[DEBUG] Creating new signup for event ${eventId}, user ${user.id}, role ${role}`);
      
      // Create new signup
      await db.EventParticipant.create({
        event_id: eventId,
        user_id: user.id,
        guild_id: guildId,
        role
      });
      
      console.log(`[DEBUG] Signup created successfully`);
      return { success: true };
    } catch (error) {
      console.error(`[ERROR] signUpForEvent failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Update event attendance
   */
  updateEventAttendance: async (eventId, userId, attended) => {
    console.log(`[DEBUG] updateEventAttendance called with eventId: ${eventId}, userId: ${userId}, attended: ${attended}`);
    try {
      // Get the event first to check guild_id
      const event = await db.Event.findByPk(eventId, {
        attributes: ['id', 'guild_id']
      });
      
      if (!event) {
        console.log(`[DEBUG] Event not found: ${eventId}`);
        throw new Error('Event not found');
      }
      
      console.log(`[DEBUG] Found event: ${event.id}, guild: ${event.guild_id}`);
      
      if (attended) {
        console.log(`[DEBUG] Marking user ${userId} as attended`);
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
        
        console.log(`[DEBUG] Participant record ${created ? 'created' : 'found'}`);
        
        // Remove from absentees if table exists
        if (db.EventAbsentee) {
          try {
            const result = await db.EventAbsentee.destroy({
              where: {
                event_id: eventId,
                user_id: userId,
                guild_id: event.guild_id
              }
            });
            console.log(`[DEBUG] Removed ${result} absentee records`);
          } catch (error) {
            console.warn(`[WARN] Failed to remove from absentees: ${error.message}`);
          }
        }
      } else {
        console.log(`[DEBUG] Marking user ${userId} as absent`);
        // If marking as absent, remove participant record if it exists
        const result = await db.EventParticipant.destroy({
          where: { 
            event_id: eventId,
            user_id: userId,
            guild_id: event.guild_id
          }
        });
        
        console.log(`[DEBUG] Removed ${result} participant records`);
        
        // Create absence record if table exists
        if (db.EventAbsentee) {
          try {
            const [absentee, created] = await db.EventAbsentee.findOrCreate({
              where: {
                event_id: eventId,
                user_id: userId,
                guild_id: event.guild_id
              }
            });
            console.log(`[DEBUG] Absentee record ${created ? 'created' : 'found'}`);
          } catch (error) {
            console.warn(`[WARN] Failed to add to absentees: ${error.message}`);
          }
        }
      }
      
      console.log(`[DEBUG] Attendance update completed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`[ERROR] updateEventAttendance failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get items in guild storage
   */
  getGuildStorageItems: async (guildId) => {
    console.log(`[DEBUG] getGuildStorageItems called with guildId: ${guildId}`);
    try {
      console.log(`[DEBUG] Attempting to fetch storage items for guild: ${guildId}`);
      
      // Add a basic database connectivity test 
      try {
        const testResult = await sequelize.query('SELECT NOW() as time');
        console.log(`[DEBUG] Storage items DB connectivity test: ${JSON.stringify(testResult[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Storage items DB connectivity test failed: ${testError.message}`);
      }
      
      // Use direct query instead of ORM
      const query = `
        SELECT gsi.*, i.name, i.type, i.icon 
        FROM guild_storage_items gsi
        LEFT JOIN items i ON gsi.item_id = i.id
        WHERE gsi.guild_id = $1
      `;
      
      console.log(`[DEBUG] Storage items query about to execute for guild: ${guildId}`);
      
      const storageItems = await sequelize.query(query, {
        bind: [guildId],
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`[DEBUG] Storage items query complete. Found ${storageItems.length} items.`);
      
      // Transform the results to match expected structure
      const formattedItems = storageItems.map(item => ({
        id: item.id,
        item_id: item.item_id,
        quantity: item.quantity,
        trait: item.trait,
        dkp_cost: item.dkp_cost,
        guild_id: item.guild_id,
        Item: {
          name: item.name,
          type: item.type,
          icon: item.icon
        }
      }));
      
      console.log(`[DEBUG] Returning ${formattedItems.length} formatted storage items`);
      return formattedItems;
    } catch (error) {
      console.error(`[ERROR] getGuildStorageItems failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get pending loot requests
   */
  getLootRequests: async (guildId) => {
    console.log(`[DEBUG] getLootRequests called with guildId: ${guildId}`);
    try {
      console.log(`[DEBUG] Querying for pending loot requests in guild ${guildId}`);
      
      const requests = await db.LootRequest.findAll({
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
      
      console.log(`[DEBUG] Found ${requests.length} pending loot requests`);
      return requests;
    } catch (error) {
      console.error(`[ERROR] getLootRequests failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Approve a loot request
   */
  approveLootRequest: async (guildId, requestId) => {
    console.log(`[DEBUG] approveLootRequest called with guildId: ${guildId}, requestId: ${requestId}`);
    const t = await db.sequelize.transaction();
    
    try {
      console.log(`[DEBUG] Finding loot request: ${requestId}`);
      
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
        console.log(`[DEBUG] Request not found: ${requestId}`);
        await t.rollback();
        return { success: false, message: 'Request not found' };
      }
      
      console.log(`[DEBUG] Found request: ${request.id}, item: ${request.storageItem?.Item?.name}, user: ${request.user?.username}`);
      
      // Check if item is still available
      if (!request.storageItem || request.storageItem.quantity < 1) {
        console.log(`[DEBUG] Item no longer available: ${request.storageItem?.id || 'unknown'}`);
        await t.rollback();
        return { success: false, message: 'Item no longer available in storage' };
      }
      
      console.log(`[DEBUG] Item available, quantity: ${request.storageItem.quantity}`);
      
      // Update request status
      console.log(`[DEBUG] Updating request status to Approved`);
      await request.update({ status: 'Approved' }, { transaction: t });
      
      // Decrement quantity
      console.log(`[DEBUG] Decrementing item quantity from ${request.storageItem.quantity} to ${request.storageItem.quantity - 1}`);
      await request.storageItem.decrement('quantity', { transaction: t });
      
      console.log(`[DEBUG] Committing transaction`);
      await t.commit();
      
      console.log(`[DEBUG] Approval successful`);
      return { 
        success: true,
        userId: request.user?.id,
        username: request.user?.username || 'Unknown',
        discordId: request.user?.discord_id,
        itemName: request.storageItem?.Item?.name || 'Unknown Item'
      };
    } catch (error) {
      console.error(`[ERROR] approveLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      await t.rollback();
      throw error;
    }
  },
  
  /**
   * Deny a loot request
   */
  denyLootRequest: async (guildId, requestId) => {
    console.log(`[DEBUG] denyLootRequest called with guildId: ${guildId}, requestId: ${requestId}`);
    try {
      console.log(`[DEBUG] Finding loot request: ${requestId}`);
      
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
        console.log(`[DEBUG] Request not found: ${requestId}`);
        return { success: false, message: 'Request not found' };
      }
      
      console.log(`[DEBUG] Found request: ${request.id}, item: ${request.storageItem?.Item?.name}, user: ${request.user?.username}`);
      
      // Update request status
      console.log(`[DEBUG] Updating request status to Denied`);
      await request.update({ status: 'Denied' });
      
      console.log(`[DEBUG] Denial successful`);
      return { 
        success: true,
        userId: request.user?.id,
        username: request.user?.username || 'Unknown',
        discordId: request.user?.discord_id,
        itemName: request.storageItem?.Item?.name || 'Unknown Item'
      };
    } catch (error) {
      console.error(`[ERROR] denyLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Create a loot request
   */
  createLootRequest: async (guildId, itemId, discordUserId) => {
    console.log(`[DEBUG] createLootRequest called with guildId: ${guildId}, itemId: ${itemId}, discordUserId: ${discordUserId}`);
    try {
      console.log(`[DEBUG] Finding user with Discord ID: ${discordUserId}`);
      
      const user = await db.User.findOne({
        where: { discord_id: discordUserId }
      });
      
      if (!user) {
        console.log(`[DEBUG] User not found for Discord ID: ${discordUserId}`);
        return { success: false, message: 'User not found' };
      }
      
      console.log(`[DEBUG] Found user: ${user.id}`);
      
      console.log(`[DEBUG] Finding storage item: ${itemId}`);
      const storageItem = await db.GuildStorageItem.findOne({
        where: { 
          id: itemId,
          guild_id: guildId
        },
        include: [db.Item]
      });
      
      if (!storageItem) {
        console.log(`[DEBUG] Item not found in storage: ${itemId}`);
        return { success: false, message: 'Item not found in storage' };
      }
      
      console.log(`[DEBUG] Found storage item: ${storageItem.id}, name: ${storageItem.Item?.name}`);
      
      // Check if user already has a pending request for this item
      console.log(`[DEBUG] Checking for existing requests`);
      const existingRequest = await db.LootRequest.findOne({
        where: {
          storage_item_id: itemId,
          user_id: user.id,
          guild_id: guildId,
          status: 'Pending'
        }
      });
      
      if (existingRequest) {
        console.log(`[DEBUG] Existing request found: ${existingRequest.id}`);
        return { success: false, message: 'You already have a pending request for this item' };
      }
      
      console.log(`[DEBUG] Creating new loot request`);
      // Create new request
      const request = await db.LootRequest.create({
        storage_item_id: itemId,
        user_id: user.id,
        guild_id: guildId,
        status: 'Pending'
      });
      
      console.log(`[DEBUG] Loot request created: ${request.id}`);
      return { 
        success: true,
        requestId: request.id,
        itemName: storageItem.Item?.name || 'Unknown Item'
      };
    } catch (error) {
      console.error(`[ERROR] createLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Get a user by Discord ID
   */
  getUserByDiscordId: async (discordId) => {
    console.log(`[DEBUG] getUserByDiscordId called with discordId: ${discordId}`);
    try {
      console.log(`[DEBUG] Querying for user with Discord ID: ${discordId}`);
      
      const user = await db.User.findOne({
        where: { discord_id: discordId },
        attributes: ['id', 'username', 'discord_id']
      });
      
      console.log(`[DEBUG] User found: ${user ? 'Yes' : 'No'}`);
      return user;
    } catch (error) {
      console.error(`[ERROR] getUserByDiscordId failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  }
};