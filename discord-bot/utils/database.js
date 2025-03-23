// backend/discord_bot/utils/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()')
  .then(result => console.log("Database connection successful, server time:", result.rows[0].now))
  .catch(err => console.error("Database connection error:", err));

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
        await pool.query('SELECT 1');
        console.log(`[DEBUG] Database connection verified before getUpcomingEvents query`);
      } catch (connError) {
        console.error(`[ERROR] Database connection test failed in getUpcomingEvents: ${connError.message}`);
      }
      
      const eventsResult = await pool.query(
        `SELECT e.*, 
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
        FROM events e
        WHERE e.guild_id = $1 AND e.event_time BETWEEN $2 AND $3
        ORDER BY e.event_time ASC`,
        [guildId, now, futureDate]
      );
      
      console.log(`[DEBUG] Found ${eventsResult.rows.length} upcoming events`);
      return eventsResult.rows;
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
      const eventResult = await pool.query(
        `SELECT e.*, 
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.role = 'TANK') as tank_count,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.role = 'HEALER') as healer_count,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id AND ep.role = 'DPS') as dps_count
        FROM events e
        WHERE e.id = $1`,
        [eventId]
      );
      
      console.log(`[DEBUG] Event found: ${eventResult.rows.length > 0 ? 'Yes' : 'No'}`);
      return eventResult.rows[0];
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
        const testResult = await pool.query('SELECT NOW() as time');
        console.log(`[DEBUG] Basic connectivity test: ${JSON.stringify(testResult.rows[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Basic connectivity test failed: ${testError.message}`);
      }
      
      const result = await pool.query(
        `SELECT app_guild_id FROM discord_guild_mappings 
         WHERE discord_guild_id = $1`,
        [discordServerId.toString()]
      );
      
      console.log(`[DEBUG] Query result for Discord mapping: ${JSON.stringify(result.rows[0])}`);
      
      if (!result.rows.length) {
        console.log(`[DEBUG] No mapping found for Discord guild ID: ${discordServerId}`);
        return null;
      }
      
      console.log(`[DEBUG] Mapping found, returning app_guild_id: ${result.rows[0].app_guild_id}`);
      return result.rows[0].app_guild_id;
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
      const teamsResult = await pool.query(
        `SELECT t.* 
         FROM teams t
         WHERE t.event_id = $1
         ORDER BY t.name ASC`,
        [eventId]
      );
      
      // For each team, get members
      const teams = [];
      
      for (const team of teamsResult.rows) {
        const membersResult = await pool.query(
          `SELECT tm.*, u.username, u.discord_id, u.builds
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1
           ORDER BY tm.position ASC`,
          [team.id]
        );
        
        teams.push({
          ...team,
          members: membersResult.rows
        });
      }
      
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
      const teamResult = await pool.query(
        `SELECT * FROM teams WHERE id = $1`,
        [teamId]
      );
      
      if (!teamResult.rows.length) {
        return null;
      }
      
      const team = teamResult.rows[0];
      
      // Get team members
      const membersResult = await pool.query(
        `SELECT tm.*, u.username, u.discord_id, u.builds
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         ORDER BY tm.position ASC`,
        [teamId]
      );
      
      team.members = membersResult.rows;
      
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
      const eventsResult = await pool.query(
        `SELECT e.id
         FROM events e
         WHERE e.guild_id = $1 AND e.event_time BETWEEN $2 AND $3`,
        [guildId, periodStart, new Date()]
      );
      
      const events = eventsResult.rows;
      console.log(`[DEBUG] Found ${events.length} events in the period`);
      
      // Get guild members
      const membersResult = await pool.query(
        `SELECT gm.user_id, u.username
         FROM guild_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.guild_id = $1`,
        [guildId]
      );
      
      const members = membersResult.rows;
      console.log(`[DEBUG] Found ${members.length} guild members`);
      
      // Calculate attendance stats
      const stats = [];
      
      for (const member of members) {
        if (!member.username) continue;
        
        let eventsAttended = 0;
        
        for (const event of events) {
          const attendanceResult = await pool.query(
            `SELECT COUNT(*) as attended
             FROM event_participants
             WHERE event_id = $1 AND user_id = $2`,
            [event.id, member.user_id]
          );
          
          if (parseInt(attendanceResult.rows[0].attended) > 0) {
            eventsAttended++;
          }
        }
        
        const attendanceRate = events.length > 0 ? 
          (eventsAttended / events.length) * 100 : 0;
        
        stats.push({
          id: member.user_id,
          username: member.username,
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
      const userResult = await pool.query(
        `SELECT id FROM users WHERE discord_id = $1`,
        [discordUserId]
      );
      
      if (!userResult.rows.length) {
        console.log(`[DEBUG] User not found for Discord ID: ${discordUserId}`);
        return { success: false, message: 'User not found' };
      }
      
      const userId = userResult.rows[0].id;
      console.log(`[DEBUG] Found user: ${userId}`);
      
      // Check if event exists
      const eventResult = await pool.query(
        `SELECT * FROM events WHERE id = $1 AND guild_id = $2`,
        [eventId, guildId]
      );
      
      if (!eventResult.rows.length) {
        console.log(`[DEBUG] Event not found: ${eventId}`);
        return { success: false, message: 'Event not found' };
      }
      
      const event = eventResult.rows[0];
      console.log(`[DEBUG] Found event: ${event.id}`);
      
      // Check if user is already signed up
      const existingResult = await pool.query(
        `SELECT * FROM event_participants 
         WHERE event_id = $1 AND user_id = $2 AND guild_id = $3`,
        [eventId, userId, guildId]
      );
      
      if (existingResult.rows.length) {
        console.log(`[DEBUG] User already signed up, updating role from ${existingResult.rows[0].role} to ${role}`);
        // Update role if already signed up
        await pool.query(
          `UPDATE event_participants SET role = $1 WHERE id = $2`,
          [role, existingResult.rows[0].id]
        );
        return { success: true, message: 'Role updated' };
      }
      
      // Check if role is full
      const participantsResult = await pool.query(
        `SELECT * FROM event_participants 
         WHERE event_id = $1 AND role = $2 AND guild_id = $3`,
        [eventId, role, guildId]
      );
      
      const participants = participantsResult.rows;
      
      const roleLimits = {
        'TANK': event.tanks || 0,
        'HEALER': event.healers || 0,
        'DPS': event.dps || 0
      };
      
      if (participants.length >= roleLimits[role]) {
        console.log(`[DEBUG] Role ${role} is full: ${participants.length}/${roleLimits[role]}`);
        return { success: false, message: `${role} slots are full` };
      }
      
      console.log(`[DEBUG] Creating new signup for event ${eventId}, user ${userId}, role ${role}`);
      
      // Create new signup
      await pool.query(
        `INSERT INTO event_participants
         (id, guild_id, event_id, user_id, role, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
        [guildId, eventId, userId, role]
      );
      
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
      const eventResult = await pool.query(
        `SELECT id, guild_id FROM events WHERE id = $1`,
        [eventId]
      );
      
      if (!eventResult.rows.length) {
        console.log(`[DEBUG] Event not found: ${eventId}`);
        throw new Error('Event not found');
      }
      
      const event = eventResult.rows[0];
      console.log(`[DEBUG] Found event: ${event.id}, guild: ${event.guild_id}`);
      
      if (attended) {
        console.log(`[DEBUG] Marking user ${userId} as attended`);
        // If marking as attended, create or ensure a participant record exists
        const participantResult = await pool.query(
          `SELECT id FROM event_participants
           WHERE event_id = $1 AND user_id = $2 AND guild_id = $3`,
          [eventId, userId, event.guild_id]
        );
        
        if (!participantResult.rows.length) {
          await pool.query(
            `INSERT INTO event_participants
             (id, guild_id, event_id, user_id, role, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'ATTENDEE', NOW(), NOW())`,
            [event.guild_id, eventId, userId]
          );
          console.log(`[DEBUG] Participant record created`);
        } else {
          console.log(`[DEBUG] Participant record found`);
        }
        
        // Remove from absentees if table exists
        try {
          const absenteeResult = await pool.query(
            `SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'event_absentees'`
          );
          
          if (absenteeResult.rows.length) {
            const result = await pool.query(
              `DELETE FROM event_absentees
               WHERE event_id = $1 AND user_id = $2 AND guild_id = $3`,
              [eventId, userId, event.guild_id]
            );
            console.log(`[DEBUG] Removed ${result.rowCount} absentee records`);
          }
        } catch (error) {
          console.warn(`[WARN] Failed to remove from absentees: ${error.message}`);
        }
      } else {
        console.log(`[DEBUG] Marking user ${userId} as absent`);
        // If marking as absent, remove participant record if it exists
        const result = await pool.query(
          `DELETE FROM event_participants
           WHERE event_id = $1 AND user_id = $2 AND guild_id = $3`,
          [eventId, userId, event.guild_id]
        );
        
        console.log(`[DEBUG] Removed ${result.rowCount} participant records`);
        
        // Create absence record if table exists
        try {
          const absenteeResult = await pool.query(
            `SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'event_absentees'`
          );
          
          if (absenteeResult.rows.length) {
            const existingAbsenteeResult = await pool.query(
              `SELECT id FROM event_absentees
               WHERE event_id = $1 AND user_id = $2 AND guild_id = $3`,
              [eventId, userId, event.guild_id]
            );
            
            if (!existingAbsenteeResult.rows.length) {
              await pool.query(
                `INSERT INTO event_absentees
                 (id, guild_id, event_id, user_id, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
                [event.guild_id, eventId, userId]
              );
              console.log(`[DEBUG] Absentee record created`);
            } else {
              console.log(`[DEBUG] Absentee record already exists`);
            }
          }
        } catch (error) {
          console.warn(`[WARN] Failed to add to absentees: ${error.message}`);
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
        const testResult = await pool.query('SELECT NOW() as time');
        console.log(`[DEBUG] Storage items DB connectivity test: ${JSON.stringify(testResult.rows[0])}`);
      } catch (testError) {
        console.error(`[ERROR] Storage items DB connectivity test failed: ${testError.message}`);
      }
      
      // Use direct query
      const storageItemsResult = await pool.query(
        `SELECT gsi.*, i.name, i.type, i.icon 
         FROM guild_storage_items gsi
         LEFT JOIN items i ON gsi.item_id = i.id
         WHERE gsi.guild_id = $1`,
        [guildId]
      );
      
      console.log(`[DEBUG] Storage items query complete. Found ${storageItemsResult.rows.length} items.`);
      
      // Transform the results to match expected structure
      const formattedItems = storageItemsResult.rows.map(item => ({
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
      
      const requestsResult = await pool.query(
        `SELECT lr.*, gsi.quantity, i.name, i.type, i.icon, u.username, u.discord_id
         FROM loot_requests lr
         JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
         JOIN items i ON gsi.item_id = i.id
         JOIN users u ON lr.user_id = u.id
         WHERE lr.guild_id = $1 AND lr.status = 'Pending'
         ORDER BY lr.created_at DESC`,
        [guildId]
      );
      
      // Transform to match expected structure
      const formattedRequests = requestsResult.rows.map(request => ({
        ...request,
        storageItem: {
          ...request,
          Item: {
            id: request.item_id,
            name: request.name,
            type: request.type,
            icon: request.icon
          }
        },
        user: {
          id: request.user_id,
          username: request.username,
          discord_id: request.discord_id
        }
      }));
      
      console.log(`[DEBUG] Found ${formattedRequests.length} pending loot requests`);
      return formattedRequests;
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log(`[DEBUG] Finding loot request: ${requestId}`);
      
      const requestResult = await client.query(
        `SELECT lr.*, gsi.quantity, i.name as item_name, i.type as item_type, 
                u.id as user_id, u.username, u.discord_id, gsi.id as storage_item_id
         FROM loot_requests lr
         JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
         JOIN items i ON gsi.item_id = i.id
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND lr.guild_id = $2`,
        [requestId, guildId]
      );
      
      if (!requestResult.rows.length) {
        console.log(`[DEBUG] Request not found: ${requestId}`);
        await client.query('ROLLBACK');
        return { success: false, message: 'Request not found' };
      }
      
      const request = requestResult.rows[0];
      console.log(`[DEBUG] Found request: ${request.id}, item: ${request.item_name}, user: ${request.username}`);
      
      // Check if item is still available
      if (request.quantity < 1) {
        console.log(`[DEBUG] Item no longer available: ${request.storage_item_id}`);
        await client.query('ROLLBACK');
        return { success: false, message: 'Item no longer available in storage' };
      }
      
      console.log(`[DEBUG] Item available, quantity: ${request.quantity}`);
      
      // Update request status
      console.log(`[DEBUG] Updating request status to Approved`);
      await client.query(
        `UPDATE loot_requests 
         SET status = 'Approved', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
      
      // Check if this is the last of the item
      const willReachZero = request.quantity <= 1;
      
      if (willReachZero) {
        // If this is the last one, remove the item from storage
        console.log(`[DEBUG] This is the last of the item - removing from storage`);
        
        // Deny all other pending requests for this item with "out of stock" status
        await client.query(
          `UPDATE loot_requests 
           SET status = 'Denied - Out of Stock', updated_at = NOW()
           WHERE storage_item_id = $1 AND status = 'Pending' AND id != $2`,
          [request.storage_item_id, request.id]
        );
        
        // Delete the item from storage
        await client.query(
          `DELETE FROM guild_storage_items WHERE id = $1`,
          [request.storage_item_id]
        );
      } else {
        // Otherwise just decrement the quantity
        console.log(`[DEBUG] Decrementing item quantity from ${request.quantity} to ${request.quantity - 1}`);
        await client.query(
          `UPDATE guild_storage_items
           SET quantity = quantity - 1, updated_at = NOW()
           WHERE id = $1`,
          [request.storage_item_id]
        );
        
        // Deny other pending requests for this specific request (not all requests for the item)
        await client.query(
          `UPDATE loot_requests 
           SET status = 'Denied - Granted to other', updated_at = NOW()
           WHERE id != $1 AND storage_item_id = $2 AND status = 'Pending'`,
          [request.id, request.storage_item_id]
        );
      }
      
      console.log(`[DEBUG] Committing transaction`);
      await client.query('COMMIT');
      
      console.log(`[DEBUG] Approval successful ${willReachZero ? '(last item removed from storage)' : ''}`);
      return { 
        success: true,
        userId: request.user_id,
        username: request.username || 'Unknown',
        discordId: request.discord_id,
        itemName: request.item_name || 'Unknown Item',
        wasLastItem: willReachZero
      };
    } catch (error) {
      console.error(`[ERROR] approveLootRequest failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  /**
   * Deny a loot request
   */
  denyLootRequest: async (guildId, requestId) => {
    console.log(`[DEBUG] denyLootRequest called with guildId: ${guildId}, requestId: ${requestId}`);
    try {
      console.log(`[DEBUG] Finding loot request: ${requestId}`);
      
      const requestResult = await pool.query(
        `SELECT lr.*, i.name as item_name, u.username, u.discord_id
         FROM loot_requests lr
         JOIN guild_storage_items gsi ON lr.storage_item_id = gsi.id
         JOIN items i ON gsi.item_id = i.id
         JOIN users u ON lr.user_id = u.id
         WHERE lr.id = $1 AND lr.guild_id = $2`,
        [requestId, guildId]
      );
      
      if (!requestResult.rows.length) {
        console.log(`[DEBUG] Request not found: ${requestId}`);
        return { success: false, message: 'Request not found' };
      }
      
      const request = requestResult.rows[0];
      console.log(`[DEBUG] Found request: ${request.id}, item: ${request.item_name}, user: ${request.username}`);
      
      // Update request status
      console.log(`[DEBUG] Updating request status to Denied`);
      await pool.query(
        `UPDATE loot_requests 
         SET status = 'Denied', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
      
      console.log(`[DEBUG] Denial successful`);
      return { 
        success: true,
        userId: request.user_id,
        username: request.username || 'Unknown',
        discordId: request.discord_id,
        itemName: request.item_name || 'Unknown Item'
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
      
      const userResult = await pool.query(
        `SELECT id FROM users WHERE discord_id = $1`,
        [discordUserId]
      );
      
      if (!userResult.rows.length) {
        console.log(`[DEBUG] User not found for Discord ID: ${discordUserId}`);
        return { success: false, message: 'User not found' };
      }
      
      const userId = userResult.rows[0].id;
      console.log(`[DEBUG] Found user: ${userId}`);
      
      console.log(`[DEBUG] Finding storage item: ${itemId}`);
      const storageItemResult = await pool.query(
        `SELECT gsi.*, i.name
         FROM guild_storage_items gsi
         JOIN items i ON gsi.item_id = i.id
         WHERE gsi.id = $1 AND gsi.guild_id = $2`,
        [itemId, guildId]
      );
      
      if (!storageItemResult.rows.length) {
        console.log(`[DEBUG] Item not found in storage: ${itemId}`);
        return { success: false, message: 'Item not found in storage' };
      }
      
      const storageItem = storageItemResult.rows[0];
      console.log(`[DEBUG] Found storage item: ${storageItem.id}, name: ${storageItem.name}`);
      
      // Check if user already has a pending request for this item
      console.log(`[DEBUG] Checking for existing requests`);
      const existingRequestResult = await pool.query(
        `SELECT id FROM loot_requests 
         WHERE storage_item_id = $1 AND user_id = $2 AND guild_id = $3 AND status = 'Pending'`,
        [itemId, userId, guildId]
      );
      
      if (existingRequestResult.rows.length) {
        console.log(`[DEBUG] Existing request found: ${existingRequestResult.rows[0].id}`);
        return { success: false, message: 'You already have a pending request for this item' };
      }
      
      console.log(`[DEBUG] Creating new loot request`);
      // Create new request
      const requestResult = await pool.query(
        `INSERT INTO loot_requests
         (id, storage_item_id, user_id, guild_id, status, created_at, updated_at)
         VALUES
         (gen_random_uuid(), $1, $2, $3, 'Pending', NOW(), NOW())
         RETURNING id`,
        [itemId, userId, guildId]
      );
      
      console.log(`[DEBUG] Loot request created: ${requestResult.rows[0].id}`);
      return { 
        success: true,
        requestId: requestResult.rows[0].id,
        itemName: storageItem.name || 'Unknown Item'
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
      
      const userResult = await pool.query(
        `SELECT id, username, discord_id FROM users WHERE discord_id = $1`,
        [discordId]
      );
      
      console.log(`[DEBUG] User found: ${userResult.rows.length > 0 ? 'Yes' : 'No'}`);
      return userResult.rows[0];
    } catch (error) {
      console.error(`[ERROR] getUserByDiscordId failed: ${error.message}`);
      console.error(`[ERROR] Error stack: ${error.stack}`);
      throw error;
    }
  },
  
  /**
   * Execute raw SQL queries
   */
  query: async (text, params) => {
    return await pool.query(text, params);
  }
};