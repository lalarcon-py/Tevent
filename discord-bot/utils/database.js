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
      
      // Skip role limit check for tentative or absent roles
      if (role !== 'TENTATIVE' && role !== 'ABSENT') {
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
        
        // Only apply limits if they're greater than zero
        if (roleLimits[role] > 0 && participants.length >= roleLimits[role]) {
          // Special case: check if user is already signed up for this role
          // In that case, we should allow them to "re-sign up" for the same role
          const isAlreadyInRole = existing && existing.role === role;
          
          if (!isAlreadyInRole) {
            console.log(`[DEBUG] Role ${role} is full: ${participants.length}/${roleLimits[role]}`);
            return { success: false, message: `${role} slots are full` };
          }
        }
      }
      
      console.log(`[DEBUG] Creating new signup for event ${eventId}, user ${user.id}, role ${role}`);
      
      // Create new signup with error handling
      // Handle the ABSENT role specifically
      if (role === 'ABSENT') {
        // For ABSENT, remove from participants
        try {
          await db.EventParticipant.destroy({
            where: {
              event_id: eventId,
              user_id: user.id
            }
          });
        } catch (err) {
          console.log(`[INFO] Could not remove from participants: ${err.message}`);
        }
        
        // Remove from tentative if that table exists
        try {
          await sequelize.query(
            `DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2`,
            { 
              bind: [eventId, user.id],
              type: sequelize.QueryTypes.DELETE
            }
          );
        } catch (err) {
          console.log(`[INFO] Could not clean up tentative record: ${err.message}`);
        }
        
        // Add to absentees
        try {
          await db.EventAbsentee.findOrCreate({
            where: {
              event_id: eventId,
              user_id: user.id,
              guild_id: guildId
            },
            defaults: {
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        } catch (err) {
          console.error(`[ERROR] Failed to mark user as absent: ${err.message}`);
          throw err;
        }
      } 
      // Handle TENTATIVE role
      else if (role === 'TENTATIVE') {
        // Remove from participants and absentees
        try {
          await db.EventParticipant.destroy({
            where: {
              event_id: eventId,
              user_id: user.id
            }
          });
        } catch (err) {
          console.log(`[INFO] Could not remove from participants: ${err.message}`);
        }
        
        try {
          await db.EventAbsentee.destroy({
            where: {
              event_id: eventId,
              user_id: user.id
            }
          });
        } catch (err) {
          console.log(`[INFO] Could not remove from absentees: ${err.message}`);
        }
        
        // Add to tentative table
        try {
          await sequelize.query(
            `INSERT INTO event_tentative (
              id, guild_id, event_id, user_id, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, NOW(), NOW()
            )
            ON CONFLICT (event_id, user_id) DO UPDATE
            SET updated_at = NOW()`,
            { 
              bind: [guildId, eventId, user.id]
            }
          );
        } catch (err) {
          // If table doesn't exist, create it and retry
          if (err.message.includes('relation "event_tentative" does not exist')) {
            try {
              await sequelize.query(`
                CREATE TABLE IF NOT EXISTS event_tentative (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  guild_id UUID NOT NULL,
                  event_id UUID NOT NULL,
                  user_id UUID NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                  CONSTRAINT event_tentative_event_user_unique UNIQUE (event_id, user_id)
                );
              `);
              
              // Retry the insert
              await sequelize.query(
                `INSERT INTO event_tentative (
                  id, guild_id, event_id, user_id, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, NOW(), NOW()
                )`,
                { 
                  bind: [guildId, eventId, user.id]
                }
              );
            } catch (retryErr) {
              console.error(`[ERROR] Failed to create tentative table and insert: ${retryErr.message}`);
              throw retryErr;
            }
          } else {
            console.error(`[ERROR] Failed to mark user as tentative: ${err.message}`);
            throw err;
          }
        }
      }
      // Regular role signup (TANK, HEALER, DPS)
      else {
        try {
          await db.EventParticipant.create({
            event_id: eventId,
            user_id: user.id,
            guild_id: guildId,
            role
          });
          
          // Remove from absentees if that table exists
          try {
            await db.EventAbsentee.destroy({
              where: {
                event_id: eventId,
                user_id: user.id
              }
            });
          } catch (err) {
            // Safely ignore if table doesn't exist or other errors
            console.log(`[INFO] Could not clean up absentee record: ${err.message}`);
          }
          
          // Remove from tentative if that table exists
          try {
            await sequelize.query(
              `DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2`,
              { 
                bind: [eventId, user.id],
                type: sequelize.QueryTypes.DELETE
              }
            );
          } catch (err) {
            // Safely ignore if table doesn't exist or other errors
            console.log(`[INFO] Could not clean up tentative record: ${err.message}`);
          }
        } catch (err) {
          if (err.name === 'SequelizeUniqueConstraintError') {
            // Handle duplicate entry - update instead
            try {
              await db.EventParticipant.update(
                { role: role },
                {
                  where: {
                    event_id: eventId,
                    user_id: user.id
                  }
                }
              );
            } catch (updateErr) {
              console.error(`[ERROR] Failed to update event participant: ${updateErr.message}`);
              throw updateErr;
            }
          } else {
            console.error(`[ERROR] Failed to create event participant: ${err.message}`);
            throw err;
          }
        }
      }
      } catch (createErr) {
        console.error(`[ERROR] Failed to create event participant: ${createErr.message}`);
        console.error(createErr.stack);
        throw createErr;
      }
      
      console.log(`[DEBUG] Signup created successfully`);
      return { 
        success: true, 
        message: `You have been signed up for the event as ${role}.`,
        eventDetails: event
      };
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
      
      // Check if this is the last of the item
      const willReachZero = request.storageItem.quantity <= 1;
      
      if (willReachZero) {
        // If this is the last one, remove the item from storage
        console.log(`[DEBUG] This is the last of the item - removing from storage`);
        
        // Deny all other pending requests for this item with "out of stock" status
        await db.LootRequest.update(
          { status: 'Denied - Out of Stock', updated_at: new Date() },
          { 
            where: {
              storage_item_id: request.storageItem.id,
              status: 'Pending',
              id: { [db.Sequelize.Op.ne]: request.id }
            },
            transaction: t
          }
        );
        
        // Delete the item from storage
        await db.GuildStorageItem.destroy({
          where: { id: request.storageItem.id },
          transaction: t
        });
      } else {
        // Otherwise just decrement the quantity
        console.log(`[DEBUG] Decrementing item quantity from ${request.storageItem.quantity} to ${request.storageItem.quantity - 1}`);
        await request.storageItem.decrement('quantity', { transaction: t });
        
        // Deny other pending requests for this specific request (not all requests for the item)
        await db.LootRequest.update(
          { status: 'Denied - Granted to other', updated_at: new Date() },
          { 
            where: {
              id: { [db.Sequelize.Op.ne]: request.id },
              storage_item_id: request.storageItem.id,
              status: 'Pending'
            },
            transaction: t
          }
        );
      }
      
      console.log(`[DEBUG] Committing transaction`);
      await t.commit();
      
      console.log(`[DEBUG] Approval successful ${willReachZero ? '(last item removed from storage)' : ''}`);
      return { 
        success: true,
        userId: request.user?.id,
        username: request.user?.username || 'Unknown',
        discordId: request.user?.discord_id,
        itemName: request.storageItem?.Item?.name || 'Unknown Item',
        wasLastItem: willReachZero
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
  createLootRequest: async (guildId, itemId, discordUserId, requestType) => {
    console.log(`[DEBUG] createLootRequest called with guildId: ${guildId}, itemId: ${itemId}, discordUserId: ${discordUserId}, requestType: ${requestType}`);
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
      
      console.log(`[DEBUG] Creating new loot request with type: ${requestType}`);
      // Create new request with the specified request type
      const request = await db.LootRequest.create({
        storage_item_id: itemId,
        user_id: user.id,
        guild_id: guildId,
        status: 'Pending',
        need_or_greed: requestType
      });
      
      console.log(`[DEBUG] Loot request created: ${request.id} with type ${requestType}`);
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
  },

    /**
   * Update event participants with robust error handling and transaction management
   * @param {string} eventId - Event UUID
   * @param {string} userId - User UUID
   * @param {string} guildId - Guild UUID
   * @param {string} role - User role (TANK, HEALER, DPS, TENTATIVE)
   * @param {boolean} isAbsent - Whether user is marked as absent
   * @returns {Promise<Object>} - Result object with success status
   */
  updateEventParticipants: async (eventId, userId, guildId, role, isAbsent) => {
    // Track metrics for this operation
    console.log(`[INFO] updateEventParticipants - Event: ${eventId}, User: ${userId}, Role: ${role}, Absent: ${isAbsent}`);
    const startTime = Date.now();
    
    // Use a connection from pool - don't rely on sequelize
    let dbClient = null;
    
    try {
      // Get client from pool with timeout
      dbClient = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 3000)
        )
      ]);
      
      // Start transaction with proper isolation level
      await dbClient.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      
      // Check that the event exists first
      const eventResult = await dbClient.query(
        'SELECT id, title FROM events WHERE id = $1 AND guild_id = $2',
        [eventId, guildId]
      );
      
      if (!eventResult.rows || eventResult.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        return { 
          success: false, 
          message: 'Event not found',
          errorCode: 'EVENT_NOT_FOUND'
        };
      }
      
      const eventTitle = eventResult.rows[0].title;
      
      // If marking as absent
      if (isAbsent) {
        // Remove from all participation tables in one step
        await dbClient.query(
          `DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2`,
          [eventId, userId]
        );
        
        // Try to remove from tentative if it exists
        try {
          await dbClient.query(
            `DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2`,
            [eventId, userId]
          );
        } catch (err) {
          // Table might not exist - safely ignore
        }
        
        // Add to absentees with a retry mechanism for constraint violations
        let retries = 3;
        let absenceRecorded = false;
        
        while (retries > 0 && !absenceRecorded) {
          try {
            // Try with ON CONFLICT handling for safety
            await dbClient.query(
              `INSERT INTO event_absentees (
                id, guild_id, event_id, user_id, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, NOW(), NOW()
              )
              ON CONFLICT (event_id, user_id) 
              DO UPDATE SET updated_at = NOW()`,
              [guildId, eventId, userId]
            );
            absenceRecorded = true;
          } catch (insertError) {
            if (insertError.code === '23505' || // Duplicate key violation
                insertError.message.includes('violates unique constraint')) {
              // If missing constraint, try creating it before retry
              try {
                await dbClient.query(`
                  DO $$
                  BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'event_absentees_event_user_unique'
                  ) THEN
                    ALTER TABLE event_absentees ADD CONSTRAINT event_absentees_event_user_unique 
                    UNIQUE (event_id, user_id);
                  END IF;
                  END $$;
                `);
              } catch (constraintError) {
                // Ignore constraint creation errors
              }
              
              // Now try deleting and reinserting
              await dbClient.query(
                'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
              );
            } else {
              // For other errors, retry with simpler insert
              await dbClient.query(
                `INSERT INTO event_absentees (
                  id, guild_id, event_id, user_id, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, NOW(), NOW()
                )`,
                [guildId, eventId, userId]
              );
              absenceRecorded = true;
            }
            retries--;
          }
        }
        
        if (!absenceRecorded) {
          console.error(`[ERROR] Failed to record absence after multiple attempts`);
        }
      } 
      // Handle tentative status
      else if (role === 'TENTATIVE') {
        // Remove from other tables
        await dbClient.query(
          'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        await dbClient.query(
          'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        // Create tentative table if it doesn't exist
        try {
          await dbClient.query(`
            CREATE TABLE IF NOT EXISTS event_tentative (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              guild_id UUID NOT NULL,
              event_id UUID NOT NULL, 
              user_id UUID NOT NULL,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              CONSTRAINT event_tentative_event_user_unique UNIQUE (event_id, user_id)
            )
          `);
        } catch (tableError) {
          // Ignore table creation errors - could be a race condition
        }
        
        // Insert with a retry mechanism
        let retries = 3;
        let tentativeRecorded = false;
        
        while (retries > 0 && !tentativeRecorded) {
          try {
            await dbClient.query(
              `INSERT INTO event_tentative (
                id, guild_id, event_id, user_id, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, NOW(), NOW()
              )
              ON CONFLICT (event_id, user_id) 
              DO UPDATE SET updated_at = NOW()`,
              [guildId, eventId, userId]
            );
            tentativeRecorded = true;
          } catch (insertError) {
            if (insertError.code === '23505' || // Duplicate key violation
                insertError.message.includes('violates unique constraint')) {
              // Try delete and reinsert
              await dbClient.query(
                'DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
              );
            } else {
              // For other errors, try simpler insert
              await dbClient.query(
                `INSERT INTO event_tentative (
                  id, guild_id, event_id, user_id, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, NOW(), NOW()
                )`,
                [guildId, eventId, userId]
              );
              tentativeRecorded = true;
            }
            retries--;
          }
        }
      }
      // Regular role signup
      else {
        // Remove from other tables
        await dbClient.query(
          'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        try {
          await dbClient.query(
            'DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
        } catch (e) {
          // Tentative table might not exist - ignore
        }
        
        // Check role limits
        const roleCountsQuery = await dbClient.query(
          `SELECT 
            COUNT(*) FILTER (WHERE role = 'TANK') as tank_count,
            COUNT(*) FILTER (WHERE role = 'HEALER') as healer_count,
            COUNT(*) FILTER (WHERE role = 'DPS') as dps_count
          FROM event_participants
          WHERE event_id = $1`,
          [eventId]
        );
        
        const roleCounts = roleCountsQuery.rows[0];
        
        // Get limit for this role
        const roleLimitsQuery = await dbClient.query(
          `SELECT tanks, healers, dps FROM events WHERE id = $1`,
          [eventId]
        );
        
        if (roleLimitsQuery.rows && roleLimitsQuery.rows.length > 0) {
          const limits = roleLimitsQuery.rows[0];
          const roleLimits = {
            'TANK': parseInt(limits.tanks || 0),
            'HEALER': parseInt(limits.healers || 0),
            'DPS': parseInt(limits.dps || 0)
          };
          
          const currentCounts = {
            'TANK': parseInt(roleCounts?.tank_count || 0),
            'HEALER': parseInt(roleCounts?.healer_count || 0),
            'DPS': parseInt(roleCounts?.dps_count || 0)
          };
          
          // Check if already signed up for same role to avoid double-counting
          const existingSignup = await dbClient.query(
            'SELECT id, role FROM event_participants WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
          
          const alreadyInRole = existingSignup.rows.length > 0 && 
                                existingSignup.rows[0].role === role;
          
          // Only check limits if not already in this role and limit is set
          if (!alreadyInRole && roleLimits[role] > 0 && currentCounts[role] >= roleLimits[role]) {
            await dbClient.query('ROLLBACK');
            return { 
              success: false, 
              message: `Sorry, the ${role} slots are full for this event.`,
              errorCode: 'ROLE_FULL'
            };
          }
        }
        
        // Check if already signed up
        const existingQuery = await dbClient.query(
          'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        if (existingQuery.rows && existingQuery.rows.length > 0) {
          // Update existing signup
          await dbClient.query(
            'UPDATE event_participants SET role = $1, updated_at = NOW() WHERE id = $2',
            [role, existingQuery.rows[0].id]
          );
        } else {
          // Create new signup with retry for UUID generation errors
          let retries = 3;
          let signupCreated = false;
          
          while (retries > 0 && !signupCreated) {
            try {
              await dbClient.query(
                `INSERT INTO event_participants (
                  id, guild_id, event_id, user_id, role, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()
                )`,
                [guildId, eventId, userId, role]
              );
              signupCreated = true;
            } catch (insertError) {
              if (insertError.message.includes('gen_random_uuid')) {
                // Try with explicit UUID
                const uuidResult = await dbClient.query('SELECT gen_random_uuid() as uuid');
                const uuid = uuidResult.rows[0].uuid;
                
                await dbClient.query(
                  `INSERT INTO event_participants (
                    id, guild_id, event_id, user_id, role, created_at, updated_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, NOW(), NOW()
                  )`,
                  [uuid, guildId, eventId, userId, role]
                );
                signupCreated = true;
              } else {
                retries--;
                if (retries === 0) throw insertError;
              }
            }
          }
        }
      }
      
      // Commit the transaction
      await dbClient.query('COMMIT');
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      console.log(`[METRICS] updateEventParticipants completed in ${duration}ms`);
      
      return { 
        success: true,
        message: isAbsent ? 
          `You are now marked as absent for "${eventTitle}".` :
          role === 'TENTATIVE' ?
            `You are now tentative for "${eventTitle}".` :
            `You are signed up as ${role} for "${eventTitle}".`
      };
    } catch (error) {
      // Rollback on any error
      if (dbClient) {
        try {
          await dbClient.query('ROLLBACK');
        } catch (rollbackError) {
          console.error(`[ERROR] Rollback failed: ${rollbackError.message}`);
        }
      }
      
      console.error(`[ERROR] updateEventParticipants failed: ${error.message}`);
      console.error(error.stack);
      
      return { 
        success: false, 
        message: 'An error occurred while updating your signup. Please try again.',
        errorCode: 'DATABASE_ERROR',
        error: error.message
      };
    } finally {
      // Always release the client back to the pool
      if (dbClient) {
        try {
          dbClient.release();
        } catch (releaseError) {
          console.error(`[ERROR] Client release failed: ${releaseError.message}`);
        }
      }
    }
  }
};