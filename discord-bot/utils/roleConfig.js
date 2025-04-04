/**
 * Role Configuration Utility
 * Handles which roles should be pinged for different notification types
 */

const { Pool } = require('pg');
const { EmbedBuilder } = require('discord.js');

// Use the existing pool
let pool;

/**
 * Set the database pool from outside this module
 * @param {Object} dbPool - PostgreSQL connection pool
 */
function setPool(dbPool) {
  if (dbPool) {
    pool = dbPool;
  }
}

/**
 * Initialize database tables for role configurations
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initDatabase() {
  try {
    // Create table for role ping configuration if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discord_role_config (
        id SERIAL PRIMARY KEY,
        guild_id UUID NOT NULL,
        discord_guild_id VARCHAR(255) NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        role_ids TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(discord_guild_id, notification_type)
      )
    `);
    
    console.log('[INFO] Role configuration tables initialized');
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to initialize role configuration tables:', error.message);
    return false;
  }
}

/**
 * Configure roles to ping for a specific notification type
 * @param {string} discordGuildId - Discord Guild ID
 * @param {string} appGuildId - Application Guild ID
 * @param {string} notificationType - Type of notification (events, items, applications, etc.)
 * @param {string[]} roleIds - Array of Discord role IDs to ping
 * @returns {Promise<object>} Result of the operation
 */
async function configureRolePings(discordGuildId, appGuildId, notificationType, roleIds) {
  try {
    if (!pool) {
      return { success: false, message: 'Database not initialized' };
    }
    
    // Validate notification type
    const validTypes = ['events', 'items', 'applications', 'gear_checks'];
    if (!validTypes.includes(notificationType)) {
      return { 
        success: false, 
        message: `Invalid notification type. Valid types are: ${validTypes.join(', ')}` 
      };
    }
    
    // Upsert the configuration
    await pool.query(`
      INSERT INTO discord_role_config 
      (discord_guild_id, guild_id, notification_type, role_ids, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (discord_guild_id, notification_type) 
      DO UPDATE SET 
        role_ids = $4,
        updated_at = NOW()
    `, [discordGuildId, appGuildId, notificationType, roleIds]);
    
    return { 
      success: true, 
      message: `Successfully configured roles for ${notificationType} notifications` 
    };
  } catch (error) {
    console.error(`[ERROR] Failed to configure role pings:`, error);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Get the role IDs to ping for a specific notification type
 * @param {string} discordGuildId - Discord Guild ID
 * @param {string} notificationType - Type of notification
 * @returns {Promise<string[]>} Array of role IDs to ping
 */
async function getRolesToPing(discordGuildId, notificationType) {
  try {
    if (!pool) {
      console.warn('[WARN] Database not initialized for role pings');
      return [];
    }
    
    const result = await pool.query(`
      SELECT role_ids FROM discord_role_config
      WHERE discord_guild_id = $1 AND notification_type = $2
    `, [discordGuildId, notificationType]);
    
    if (result.rows.length > 0 && result.rows[0].role_ids) {
      return result.rows[0].role_ids;
    }
    
    return [];
  } catch (error) {
    console.error(`[ERROR] Failed to get roles to ping:`, error);
    return [];
  }
}

/**
 * Format role pings for a message
 * @param {string[]} roleIds - Array of role IDs to ping
 * @returns {string} Formatted role pings for the message
 */
function formatRolePings(roleIds) {
  if (!roleIds || roleIds.length === 0) {
    return '';
  }
  
  return roleIds.map(id => `<@&${id}>`).join(' ');
}

/**
 * List all role ping configurations for a Discord guild
 * @param {string} discordGuildId - Discord Guild ID
 * @returns {Promise<object[]>} Array of role ping configurations
 */
async function listRoleConfigurations(discordGuildId) {
  try {
    if (!pool) {
      return [];
    }
    
    const result = await pool.query(`
      SELECT notification_type, role_ids
      FROM discord_role_config
      WHERE discord_guild_id = $1
    `, [discordGuildId]);
    
    return result.rows;
  } catch (error) {
    console.error(`[ERROR] Failed to list role configurations:`, error);
    return [];
  }
}

/**
 * Clear role pings for a notification type
 * @param {string} discordGuildId - Discord Guild ID
 * @param {string} notificationType - Type of notification
 * @returns {Promise<object>} Result of the operation
 */
async function clearRolePings(discordGuildId, notificationType) {
  try {
    if (!pool) {
      return { success: false, message: 'Database not initialized' };
    }
    
    await pool.query(`
      DELETE FROM discord_role_config
      WHERE discord_guild_id = $1 AND notification_type = $2
    `, [discordGuildId, notificationType]);
    
    return { 
      success: true, 
      message: `Successfully cleared role pings for ${notificationType} notifications` 
    };
  } catch (error) {
    console.error(`[ERROR] Failed to clear role pings:`, error);
    return { success: false, message: `Error: ${error.message}` };
  }
}

module.exports = {
  setPool,
  initDatabase,
  configureRolePings,
  getRolesToPing,
  formatRolePings,
  listRoleConfigurations,
  clearRolePings
};
