// discord-bot/utils/calendarEvents.js
const { pool } = require('pg');
const { formatToServerTime, createDiscordTimestamp } = require('./timeUtils');

/**
 * Create a Discord calendar event with server time zone adjustment
 * @param {Guild} guild - Discord guild object
 * @param {Object} eventData - Event data with title, description, etc.
 * @returns {Promise<ScheduledEvent|null>} - Created Discord scheduled event or null if failed
 */

async function createDiscordCalendarEvent(guild, eventData) {
    try {
      // Get the event time formatted for this server's time zone
      const serverAdjustedTime = await formatToServerTime(
        eventData.event_time,
        guild.id
      );
      
      // Create an end time 3 hours after start time (adjust as needed)
      const endTime = new Date(serverAdjustedTime);
      endTime.setHours(endTime.getHours() + 3);
      
      console.log(`[INFO] Creating Discord calendar event: ${eventData.title}`);
      console.log(`[INFO] Original time (UTC): ${new Date(eventData.event_time).toISOString()}`);
      console.log(`[INFO] Server-adjusted time: ${serverAdjustedTime.toISOString()}`);
      console.log(`[INFO] End time: ${endTime.toISOString()}`);
      
      // Create the Discord calendar event
      const discordEvent = await guild.scheduledEvents.create({
        name: eventData.title,
        description: eventData.description || 'No description provided',
        scheduledStartTime: serverAdjustedTime,
        scheduledEndTime: endTime, // Add end time
        privacyLevel: 2, // GUILD_ONLY
        entityType: 3, // EXTERNAL
        entityMetadata: {
          location: eventData.location || 'Not specified'
        }
      });
      
      console.log(`[INFO] Successfully created Discord calendar event: ${discordEvent.id}`);
      
      // Store the Discord event ID in our database for later reference
      try {
        await pool.query(
          `INSERT INTO discord_event_ids
           (event_id, discord_event_id, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (event_id) DO UPDATE SET
           discord_event_id = $2, updated_at = NOW()`,
          [eventData.id, discordEvent.id]
        );
      } catch (dbError) {
        console.error(`[ERROR] Failed to store Discord event ID: ${dbError.message}`);
        // Continue anyway as the event was created successfully
      }
      
      return discordEvent;
    } catch (error) {
      console.error(`[ERROR] Failed to create Discord calendar event:`, error);
      return null;
    }
  }

/**
 * Update an existing Discord calendar event
 * @param {Guild} guild - Discord guild object
 * @param {Object} eventData - Updated event data
 * @returns {Promise<ScheduledEvent|null>} - Updated Discord scheduled event or null if failed
 */
async function updateDiscordCalendarEvent(guild, eventData) {
  try {
    // Find the Discord event ID for this event
    const result = await pool.query(
      `SELECT discord_event_id FROM discord_event_ids WHERE event_id = $1`,
      [eventData.id]
    );
    
    if (!result.rows.length) {
      console.log(`[INFO] No Discord event found for event ${eventData.id}, creating new one`);
      return createDiscordCalendarEvent(guild, eventData);
    }
    
    const discordEventId = result.rows[0].discord_event_id;
    
    // Get the event time formatted for this server's time zone
    const serverAdjustedTime = await formatToServerTime(
      eventData.event_time,
      guild.id
    );
    
    // Get the existing scheduled event
    const scheduledEvent = await guild.scheduledEvents.fetch(discordEventId);
    
    if (!scheduledEvent) {
      console.log(`[INFO] Discord event ${discordEventId} no longer exists, creating new one`);
      return createDiscordCalendarEvent(guild, eventData);
    }
    
    // Update the event
    const updatedEvent = await scheduledEvent.edit({
      name: eventData.title,
      description: eventData.description || 'No description provided',
      scheduledStartTime: serverAdjustedTime,
      entityMetadata: {
        location: eventData.location || 'Not specified'
      }
    });
    
    console.log(`[INFO] Successfully updated Discord calendar event: ${updatedEvent.id}`);
    return updatedEvent;
  } catch (error) {
    console.error(`[ERROR] Failed to update Discord calendar event:`, error);
    return null;
  }
}

/**
 * Delete a Discord calendar event
 * @param {Guild} guild - Discord guild object
 * @param {string} eventId - Event ID in our database
 * @returns {Promise<boolean>} - Whether deletion was successful
 */
async function deleteDiscordCalendarEvent(guild, eventId) {
  try {
    // Find the Discord event ID for this event
    const result = await pool.query(
      `SELECT discord_event_id FROM discord_event_ids WHERE event_id = $1`,
      [eventId]
    );
    
    if (!result.rows.length) {
      console.log(`[INFO] No Discord event found for event ${eventId}`);
      return true; // Nothing to delete
    }
    
    const discordEventId = result.rows[0].discord_event_id;
    
    // Get the existing scheduled event
    try {
      const scheduledEvent = await guild.scheduledEvents.fetch(discordEventId);
      
      if (scheduledEvent) {
        await scheduledEvent.delete();
        console.log(`[INFO] Successfully deleted Discord calendar event: ${discordEventId}`);
      }
    } catch (fetchError) {
      console.log(`[INFO] Discord event ${discordEventId} already deleted or not found`);
    }
    
    // Remove from our database
    await pool.query(
      `DELETE FROM discord_event_ids WHERE event_id = $1`,
      [eventId]
    );
    
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to delete Discord calendar event:`, error);
    return false;
  }
}

module.exports = {
  createDiscordCalendarEvent,
  updateDiscordCalendarEvent,
  deleteDiscordCalendarEvent
};