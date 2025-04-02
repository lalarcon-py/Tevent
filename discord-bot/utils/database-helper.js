// discord-bot/utils/database-helper.js
const { Pool } = require('pg');

// Reuse existing Pool configuration from index.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

/**
 * Simple database helper for event signup functionality
 */
module.exports = {
  /**
   * Update event participants with robust error handling
   */
  updateEventParticipants: async (eventId, userId, guildId, role, isAbsent) => {
    // Track metrics for this operation
    console.log(`[INFO] updateEventParticipants - Event: ${eventId}, User: ${userId}, Role: ${role}, Absent: ${isAbsent}`);
    
    // Use a connection from pool
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Check that the event exists first
      const eventResult = await client.query(
        'SELECT id, title FROM events WHERE id = $1 AND guild_id = $2',
        [eventId, guildId]
      );
      
      if (!eventResult.rows || eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          message: 'Event not found'
        };
      }
      
      const eventTitle = eventResult.rows[0].title;
      
      // Handle different roles
      if (isAbsent) {
        // Remove from participants
        await client.query(
          'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        // Try to remove from tentative if that table exists
        try {
          await client.query(
            'DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
        } catch (e) {
          // Table might not exist, ignore
        }
        
        // Add to absentees
        await client.query(
          `INSERT INTO event_absentees (
            id, guild_id, event_id, user_id, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, NOW(), NOW()
          )
          ON CONFLICT (event_id, user_id) DO NOTHING`,
          [guildId, eventId, userId]
        );
      } 
      else if (role === 'TENTATIVE') {
        // Remove from other tables
        await client.query(
          'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        await client.query(
          'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        // Create tentative table if it doesn't exist
        try {
          await client.query(`
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
          
          // Add to tentative
          await client.query(
            `INSERT INTO event_tentative (
              id, guild_id, event_id, user_id, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, NOW(), NOW()
            )
            ON CONFLICT (event_id, user_id) DO UPDATE SET updated_at = NOW()`,
            [guildId, eventId, userId]
          );
        } catch (e) {
          // Ignore table errors
        }
      }
      else {
        // Regular role signup
        // Remove from other tables
        await client.query(
          'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        try {
          await client.query(
            'DELETE FROM event_tentative WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
          );
        } catch (e) {
          // Table might not exist, ignore
        }
        
        // Check if already signed up
        const existingResult = await client.query(
          'SELECT id FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        if (existingResult.rows && existingResult.rows.length > 0) {
          // Update existing signup
          await client.query(
            'UPDATE event_participants SET role = $1, updated_at = NOW() WHERE id = $2',
            [role, existingResult.rows[0].id]
          );
        } else {
          // Create new signup
          await client.query(
            `INSERT INTO event_participants (
              id, guild_id, event_id, user_id, role, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()
            )`,
            [guildId, eventId, userId, role]
          );
        }
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      
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
      await client.query('ROLLBACK');
      console.error(`[ERROR] updateEventParticipants failed: ${error.message}`);
      
      return { 
        success: false, 
        message: 'An error occurred while updating your signup. Please try again.',
        error: error.message
      };
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  },
  
  /**
   * Get guild ID from Discord server ID
   */
  getGuildIdFromDiscord: async (discordServerId) => {
    try {
      const result = await pool.query(
        'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
        [discordServerId.toString()]
      );
      
      if (!result.rows || result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].app_guild_id;
    } catch (error) {
      console.error(`[ERROR] getGuildIdFromDiscord failed: ${error.message}`);
      return null;
    }
  },
  
  /**
   * Get user by Discord ID
   */
  getUserByDiscordId: async (discordId) => {
    try {
      const result = await pool.query(
        'SELECT id, username FROM users WHERE discord_id = $1',
        [discordId]
      );
      
      if (!result.rows || result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`[ERROR] getUserByDiscordId failed: ${error.message}`);
      return null;
    }
  }
};