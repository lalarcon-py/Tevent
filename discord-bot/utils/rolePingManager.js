/**
 * Role Ping Manager - Utilities for handling role pings
 */
const { Pool } = require('pg');

// Will be initialized with the database connection pool
let pool;

/**
 * Get role IDs to ping for a specific notification type
 * @param {string} guildId - The application guild ID
 * @param {string} type - The notification type (e.g., 'events', 'storage')
 * @returns {Promise<{enabled: boolean, roleIds: string[]}>} - Ping configuration
 */
async function getRolesToPing(guildId, type) {
  try {
    // Get role ping configuration from database
    const result = await pool.query(
      `SELECT enabled, role_ids FROM discord_role_ping_config 
       WHERE guild_id = $1 AND type = $2`,
      [guildId, type]
    );
    
    // If no configuration found, return default (enabled but no roles)
    if (!result.rows.length) {
      return { enabled: true, roleIds: [] };
    }
    
    const config = result.rows[0];
    return { 
      enabled: config.enabled, 
      roleIds: config.role_ids || [] 
    };
  } catch (error) {
    console.error(`[ERROR] Error getting roles to ping:`, error);
    // In case of error, return default values
    return { enabled: true, roleIds: [] };
  }
}

/**
 * Format role pings for inclusion in a message
 * @param {string[]} roleIds - Array of role IDs to ping
 * @returns {string} - Formatted string for pinging roles
 */
function formatRolePings(roleIds) {
  if (!roleIds || roleIds.length === 0) {
    return '';
  }
  
  // Format each role as a mention
  return roleIds.map(id => `<@&${id}>`).join(' ');
}

/**
 * Create a ping string for a specific notification type
 * @param {string} guildId - The application guild ID
 * @param {string} type - The notification type (e.g., 'events', 'storage')
 * @returns {Promise<string>} - Formatted ping string (empty if disabled)
 */
async function createPingString(guildId, type) {
  // Get roles configuration
  const { enabled, roleIds } = await getRolesToPing(guildId, type);
  
  // If disabled or no roles, return empty string
  if (!enabled || !roleIds.length) {
    return '';
  }
  
  // Otherwise, format the role pings
  return formatRolePings(roleIds);
}

/**
 * Update ping configuration for a guild and type
 * @param {string} guildId - The application guild ID
 * @param {string} type - The notification type (e.g., 'events', 'storage')
 * @param {Object} config - Configuration object
 * @param {boolean} [config.enabled] - Whether pinging is enabled
 * @param {string[]} [config.roleIds] - Array of role IDs to ping
 * @returns {Promise<boolean>} - Whether the update was successful
 */
async function updatePingConfig(guildId, type, config) {
  try {
    // Check if config exists
    const existsResult = await pool.query(
      `SELECT id FROM discord_role_ping_config 
       WHERE guild_id = $1 AND type = $2`,
      [guildId, type]
    );
    
    // Build update query based on provided fields
    let query, params;
    if (existsResult.rows.length) {
      // Update existing config
      const setFields = [];
      params = [guildId, type];
      
      // Add enabled if provided
      if (config.enabled !== undefined) {
        setFields.push(`enabled = $${params.length + 1}`);
        params.push(config.enabled);
      }
      
      // Add roleIds if provided
      if (config.roleIds !== undefined) {
        // Ensure it's an array
        const roleIdsArray = Array.isArray(config.roleIds) ? config.roleIds : [];
        setFields.push(`role_ids = $${params.length + 1}`);
        params.push(roleIdsArray);
      }
      
      // If nothing to update, return early
      if (setFields.length === 0) {
        return true;
      }
      
      setFields.push(`updated_at = NOW()`);
      
      query = `
        UPDATE discord_role_ping_config 
        SET ${setFields.join(', ')}
        WHERE guild_id = $1 AND type = $2
      `;
    } else {
      // Insert new config
      const roleIdsArray = Array.isArray(config.roleIds) ? config.roleIds : [];
      const enabled = config.enabled !== undefined ? config.enabled : true;
      
      query = `
        INSERT INTO discord_role_ping_config 
        (id, guild_id, type, role_ids, enabled, created_at, updated_at)
        VALUES 
        (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
      `;
      
      params = [guildId, type, roleIdsArray, enabled];
    }
    
    // Execute the query
    await pool.query(query, params);
    
    return true;
  } catch (error) {
    console.error(`[ERROR] Error updating ping config:`, error);
    return false;
  }
}

/**
 * Set the database pool
 * @param {Object} dbPool - PostgreSQL connection pool
 */
function setPool(dbPool) {
  if (dbPool) {
    pool = dbPool;
  }
}

module.exports = {
  getRolesToPing,
  formatRolePings,
  createPingString,
  updatePingConfig,
  setPool
};
