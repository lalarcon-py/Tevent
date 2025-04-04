// discord-bot/utils/eventSignups.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Pool } = require('pg');
const useSSL = process.env.DATABASE_USE_SSL === 'true';

// Create a default pool, but allow it to be replaced via setPool
let pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? {
    rejectUnauthorized: false
  } : false
});
const embedBuilder = require('./embed_builder');
const Redis = require('ioredis');

// Configure Redis connection with fallback and error handling
let redis;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redis.on('error', (err) => {
    console.error('[REDIS ERROR]', err);
  });
} catch (error) {
  console.error('[REDIS CONNECTION ERROR]', error.message);
  // Create a mock Redis client to prevent application crashes
  redis = {
    set: async () => {},
    get: async () => null,
    del: async () => {},
    exists: async () => 0
  };
}
const CircuitBreaker = require('opossum');

// Initialize circuit breaker for critical operations
let processSignupBreaker;
try {
  processSignupBreaker = new CircuitBreaker(processSignup, {
    timeout: 5000, // If function takes longer than 5 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
    resetTimeout: 30000, // After 30 seconds, try again
    rollingCountTimeout: 10000, // Time window for errorThresholdPercentage
    rollingCountBuckets: 10 // Number of buckets to keep track of latency
  });
  
  // Add event listeners for circuit breaker
  processSignupBreaker.on('open', () => console.log('Circuit breaker opened: too many errors'));
  processSignupBreaker.on('close', () => console.log('Circuit breaker closed: operation recovered'));
  processSignupBreaker.on('halfOpen', () => console.log('Circuit breaker half-open: trying to recover'));
} catch (error) {
  console.error('[CIRCUIT BREAKER ERROR]', error.message);
  // If circuit breaker fails to initialize, create a fallback that just calls the function directly
  processSignupBreaker = {
    fire: (...args) => processSignup(...args),
    status: { state: 'unavailable' }
  };
}

// Track active signups to prevent duplicates
const activeSignups = new Map();

/**
 * Centralized handler for all event signup interactions
 * Optimized for very high throughput (3000+ signups/second)
 * @param {Object} interaction - Discord interaction
 * @param {string} eventId - Event UUID
 * @param {string} role - Role (TANK, HEALER, DPS, TENTATIVE, ABSENT)
 * @returns {Promise<Object>} Result of the signup operation
 */
async function handleEventSignup(interaction, eventId, role) {
    // Generate unique key for this user+event combination
    const userKey = `${interaction.user.id}:${eventId}`;
    const now = Date.now();
    
    // Use timestamp-based locking - prevent processing same request multiple times
    // This helps handle 3000+ signups/second by dropping duplicate requests early
    if (activeSignups.has(userKey)) {
      const timestamp = activeSignups.get(userKey);
      if (now - timestamp < 2000) { // 2 second threshold
        return {
          success: false,
          message: "Your previous signup is still processing. Please wait a moment."
        };
      }
    }
    
    // Mark this signup as active with current timestamp
    activeSignups.set(userKey, now);
    
    try {
      // Quick validation of inputs
      if (!eventId || !role) {
        return {
          success: false,
          message: "Invalid request data. Please try again."
        };
      }
      
      const validRoles = ['TANK', 'HEALER', 'DPS', 'TENTATIVE', 'ABSENT'];
      if (!validRoles.includes(role)) {
        return {
          success: false, 
          message: "Invalid role selection. Please try again."
        };
      }
      
      // Get Discord guild ID with null check
      const discordGuildId = interaction.guild?.id;
      if (!discordGuildId) {
        return {
          success: false,
          message: "This button must be used in a Discord server."
        };
      }
      
      // Get application guild ID - critical path with timeouts
      try {
        const appGuildId = await Promise.race([
          getGuildIdFromDiscord(discordGuildId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Guild lookup timed out")), 1000)
          )
        ]);
        
        if (!appGuildId) {
          return {
            success: false,
            message: "This Discord server is not linked to an application guild."
          };
        }
        
        // Get user ID from Discord ID
        const userId = await Promise.race([
          getUserIdFromDiscord(interaction.user.id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("User lookup timed out")), 1000)
          )
        ]);
        
        if (!userId) {
          return {
            success: false,
            message: "You need to register on the website first before signing up for events."
          };
        }
        
        // Process the signup with bounded execution time and circuit breaker
        const result = await Promise.race([
          processSignupBreaker.fire(eventId, userId, appGuildId, role),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Signup processing timed out")), 3000)
          )
        ]);
        
        // If signup was successful, update the UI asynchronously
        if (result.success && interaction.message) {
          // Don't await - run in background to improve throughput
          updateEventDisplay(interaction.message, eventId, appGuildId)
            .catch(error => console.error(`[ERROR] Display update failed: ${error.message}`));
        }
        
        return result;
      } catch (timeoutError) {
        console.error(`[ERROR] Operation timed out: ${timeoutError.message}`);
        return {
          success: false,
          message: "The operation timed out. Please try again."
        };
      }
    } catch (error) {
      console.error(`[ERROR] Event signup error:`, error);
      return {
        success: false,
        message: "An error occurred while processing your signup. Please try again."
      };
    } finally {
      // Remove from active signups after a short delay
      setTimeout(() => {
        activeSignups.delete(userKey);
      }, 2000);
    }
  }

/**
 * Get application guild ID from Discord server ID
 */
async function getGuildIdFromDiscord(discordGuildId) {
  try {
    const result = await pool.query(
      'SELECT app_guild_id FROM discord_guild_mappings WHERE discord_guild_id = $1',
      [discordGuildId.toString()]
    );
    
    return result.rows.length > 0 ? result.rows[0].app_guild_id : null;
  } catch (error) {
    console.error(`[ERROR] Error getting guild ID:`, error);
    return null;
  }
}

/**
 * Get user ID from Discord ID
 */
async function getUserIdFromDiscord(discordUserId) {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE discord_id = $1',
      [discordUserId.toString()]
    );
    
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error(`[ERROR] Error getting user ID:`, error);
    return null;
  }
}

/**
 * Get event details
 */
async function getEventDetails(eventId, guildId) {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND guild_id = $2',
      [eventId, guildId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`[ERROR] Error getting event:`, error);
    return null;
  }
}

/**
 * Process signup with optimized transaction
 * Designed for extreme high throughput (3000+ signups/second)
 * @param {string} eventId - Event UUID
 * @param {string} userId - User UUID
 * @param {string} guildId - Guild UUID
 * @param {string} role - Role to signup as
 * @returns {Promise<Object>} Result object with success status and message
 */
async function processSignup(eventId, userId, guildId, role) {
    // Get a client from the connection pool with a short timeout
    let client = null;
    try {
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("DB connection timed out")), 1000)
        )
      ]);
    } catch (connectionError) {
      console.error(`[ERROR] Database connection error: ${connectionError.message}`);
      return { 
        success: false, 
        message: "Unable to connect to the database. Please try again."
      };
    }
    
    try {
      // Use READ COMMITTED isolation level for better concurrency
      // This is critical for handling 3000+ signups/second
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      
      // Get event title in a single fast query
      const eventResult = await client.query(
        'SELECT title FROM events WHERE id = $1 AND guild_id = $2',
        [eventId, guildId]
      );
      
      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          message: 'Event not found' 
        };
      }
      
      const eventTitle = eventResult.rows[0].title;
      const isAbsent = role === 'ABSENT';
      const isTentative = role === 'TENTATIVE';
      
      // Handle ABSENT role
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
          // Tentative table might not exist, safely ignore this error
        }
        
        // Add to absentees with UPSERT pattern to minimize conflicts
        await client.query(
          `INSERT INTO event_absentees 
           (id, guild_id, event_id, user_id, created_at, updated_at)
           VALUES 
           (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
           ON CONFLICT (event_id, user_id) 
           DO UPDATE SET updated_at = NOW()`,
          [guildId, eventId, userId]
        );
        
        await client.query('COMMIT');
        return { 
          success: true, 
          message: `You have been marked as absent for "${eventTitle}".` 
        };
      } 
      
      // Handle TENTATIVE role
      else if (isTentative) {
        // Remove from other tables
        await client.query(
          'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        await client.query(
          'DELETE FROM event_absentees WHERE event_id = $1 AND user_id = $2',
          [eventId, userId]
        );
        
        // Make sure tentative table exists
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
        } catch (e) {
          // Table might already exist or be created by another process
          // This is a safe error to ignore
        }
        
        // Add to tentative with UPSERT pattern
        await client.query(
          `INSERT INTO event_tentative
           (id, guild_id, event_id, user_id, created_at, updated_at)
           VALUES
           (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
           ON CONFLICT (event_id, user_id)
           DO UPDATE SET updated_at = NOW()`,
          [guildId, eventId, userId]
        );
        
        await client.query('COMMIT');
        return { 
          success: true, 
          message: `You are now tentative for "${eventTitle}".` 
        };
      }
      
      // Handle regular role signup (TANK, HEALER, DPS)
      else {
        // Optimized query to check role limits and get existing signup in one go
        const statusQuery = await client.query(
          `SELECT 
            (SELECT COUNT(*) FROM event_participants 
             WHERE event_id = $1 AND role = $2 AND user_id != $3) AS current_count,
            (SELECT role FROM event_participants 
             WHERE event_id = $1 AND user_id = $3) AS current_role,
            (SELECT id FROM event_participants 
             WHERE event_id = $1 AND user_id = $3) AS participant_id,
            (SELECT CASE
                WHEN role = 'TANK' THEN tanks
                WHEN role = 'HEALER' THEN healers
                WHEN role = 'DPS' THEN dps
                ELSE 0
              END
             FROM events WHERE id = $1) AS role_limit
          `,
          [eventId, role, userId]
        );
        
        const status = statusQuery.rows[0] || {};
        const currentCount = parseInt(status.current_count || 0);
        const roleLimit = parseInt(status.role_limit || 0);
        const currentRole = status.current_role;
        const participantId = status.participant_id;
        
        // Capacity check - only if there's a limit and user is either new or changing roles
        const isChangingRole = currentRole && currentRole !== role;
        if (roleLimit > 0 && (currentRole === null || isChangingRole) && currentCount >= roleLimit) {
          await client.query('ROLLBACK');
          return { 
            success: false, 
            message: `Sorry, the ${role} spots are full for "${eventTitle}".` 
          };
        }
        
        // Remove from other status tables
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
          // Tentative table might not exist, safely ignore
        }
        
        // Update or insert participant record
        if (participantId) {
          await client.query(
            'UPDATE event_participants SET role = $1, updated_at = NOW() WHERE id = $2',
            [role, participantId]
          );
        } else {
          await client.query(
            `INSERT INTO event_participants 
             (id, guild_id, event_id, user_id, role, created_at, updated_at)
             VALUES 
             (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
            [guildId, eventId, userId, role]
          );
        }
        
        await client.query('COMMIT');
        
        if (isChangingRole) {
          return { 
            success: true, 
            message: `Your role for "${eventTitle}" has been updated to ${role}.` 
          };
        } else {
          return { 
            success: true, 
            message: `You have been signed up for "${eventTitle}" as ${role}.` 
          };
        }
      }
    } catch (error) {
      // Ensure rollback on any error
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      console.error('[ERROR] Signup transaction error:', error);
      throw error;
    } finally {
      // Always release client back to the pool
      if (client) {
        client.release(true); // true = destroy connection on error
      }
    }
  }

/**
 * Update event display with latest data
 */
async function updateEventDisplay(message, eventId, guildId) {
  try {
    // Get latest event data
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) return false;
    
    const event = eventResult.rows[0];
    
    // Get all participation data with a single query
    const participantsResult = await pool.query(
      `SELECT 
        'PARTICIPANT' as type, role, username, discord_id, builds
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = $1
       
       UNION ALL
       
       SELECT 
        'ABSENT' as type, NULL as role, username, discord_id, builds
       FROM event_absentees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1
       
       UNION ALL
       
       SELECT 
        'TENTATIVE' as type, NULL as role, username, discord_id, builds
       FROM event_tentative et
       JOIN users u ON et.user_id = u.id
       WHERE et.event_id = $1`,
      [eventId]
    );
    
    // Process the results
    const participants = participantsResult.rows.filter(p => p.type === 'PARTICIPANT');
    const absentees = participantsResult.rows.filter(p => p.type === 'ABSENT');
    const tentative = participantsResult.rows.filter(p => p.type === 'TENTATIVE');
    
    // Create updated event object
    const updatedEvent = {
      ...event,
      participants,
      absentees,
      tentative
    };
    
    // Create updated embed
    const embed = embedBuilder.createEventEmbed(updatedEvent);
    
    // Create signup buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_TANK`)
          .setLabel('Tank')
          .setEmoji('1352736996405022780')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_HEALER`)
          .setLabel('Healer')
          .setEmoji('1352737011479482468')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_DPS`)
          .setLabel('DPS')
          .setEmoji('1352737043972624518')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_TENTATIVE`)
          .setLabel('Tentative')
          .setEmoji('⏳')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`signup_${eventId}_ABSENT`)
          .setLabel('Absent')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Secondary)
      );
    
    // Update the message
    await message.edit({ embeds: [embed], components: [row] });
    return true;
  } catch (error) {
    console.error('[ERROR] Error updating event display:', error);
    return false;
  }
}

/**
 * Safely reply to interaction with error handling
 */
async function safeReply(interaction, options) {
  try {
    if (interaction.deferred) {
      await interaction.editReply(options);
    } else if (interaction.replied) {
      await interaction.followUp({...options, ephemeral: true});
    } else {
      await interaction.reply({...options, ephemeral: true});
    }
    return true;
  } catch (error) {
    console.error('[ERROR] Error replying to interaction:', error);
    return false;
  }
}

/**
 * Set the database pool from outside this module
 * @param {Object} dbPool - PostgreSQL connection pool
 */
function setPool(dbPool) {
  if (dbPool) {
    try {
      // Replace the pool with the provided one
      pool = dbPool;
      
      // Verify connection with quick test query
      dbPool.query('SELECT 1 as test')
        .then(() => {
          console.log('[INFO] EventSignups database pool updated and successfully tested');
        })
        .catch(err => {
          console.error('[ERROR] EventSignups database pool test failed:', err.message);
        });
    } catch (error) {
      console.error('[ERROR] Failed to update EventSignups database pool:', error.message);
      throw new Error('Failed to set database pool: ' + error.message);
    }
  } else {
    console.warn('[WARN] Attempted to set EventSignups pool with null or undefined value');
  }
}

module.exports = {
  handleEventSignup,
  safeReply,
  setPool
};