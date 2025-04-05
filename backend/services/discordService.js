/**
 * Discord Service for TeventGM Web App
 * Handles communication with the Discord bot service
 */
const axios = require('axios');
const { Pool } = require('pg');

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

// Discord bot service configuration
const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL || 'http://localhost:3300';
const DISCORD_BOT_API_KEY = process.env.DISCORD_BOT_API_KEY || 'teventgm_discord_api_key_secure_string';
const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || 'teventgm_discord_webhook_secret_secure_string';

// Configure axios instance for communicating with bot service
const botApi = axios.create({
  baseURL: DISCORD_BOT_URL,
  headers: {
    'X-API-Key': DISCORD_BOT_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  CHANNELS: 60 * 60 * 1000, // 1 hour
  ROLES: 60 * 60 * 1000,    // 1 hour
};

/**
 * Check the health of the Discord bot service
 * @returns {Promise<Object>} Health status
 */
async function checkHealth() {
  try {
    const response = await botApi.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error checking Discord bot health:', error.message);
    return {
      status: 'error',
      error: error.message,
      connected: false
    };
  }
}

/**
 * Get Discord channels for a guild with caching
 * @param {string} guildId - Application guild ID
 * @returns {Promise<Array>} Array of channel objects
 */
async function getDiscordChannels(guildId) {
  try {
    // Get Discord guild ID from mapping
    const discordGuildId = await getDiscordGuildId(guildId);
    if (!discordGuildId) {
      console.log(`No Discord guild mapping found for guild ${guildId}`);
      return [];
    }
    
    // Try to get from cache first
    const cachedChannels = await getFromCache('channels', guildId);
    if (cachedChannels) {
      console.log(`Using cached channels for guild ${guildId}`);
      return cachedChannels;
    }
    
    console.log(`Fetching channels from bot API for guild ${guildId} (Discord ID: ${discordGuildId})`);
    
    // Fetch channels from bot API
    const response = await botApi.get(`/api/channels/guilds/${discordGuildId}`);
    const channels = response.data;
    
    // Update cache
    await updateCache('channels', guildId, channels);
    
    return channels;
  } catch (error) {
    console.error('Error fetching Discord channels:', error.message);
    // Return empty array for graceful failure
    return [];
  }
}

/**
 * Get Discord roles for a guild with caching
 * @param {string} guildId - Application guild ID
 * @returns {Promise<Array>} Array of role objects
 */
async function getDiscordRoles(guildId) {
  try {
    // Get Discord guild ID from mapping
    const discordGuildId = await getDiscordGuildId(guildId);
    if (!discordGuildId) {
      console.log(`No Discord guild mapping found for guild ${guildId}`);
      return [];
    }
    
    // Try to get from cache first
    const cachedRoles = await getFromCache('roles', guildId);
    if (cachedRoles) {
      console.log(`Using cached roles for guild ${guildId}`);
      return cachedRoles;
    }
    
    console.log(`Fetching roles from bot API for guild ${guildId} (Discord ID: ${discordGuildId})`);
    
    // Fetch roles from bot API
    const response = await botApi.get(`/api/roles/guilds/${discordGuildId}`);
    const roles = response.data;
    
    // Update cache
    await updateCache('roles', guildId, roles);
    
    return roles;
  } catch (error) {
    console.error('Error fetching Discord roles:', error.message);
    // Return empty array for graceful failure
    return [];
  }
}

/**
 * Send a message to a Discord channel
 * @param {string} guildId - Application guild ID
 * @param {string} channelType - Channel type (events, storage, etc.)
 * @param {Object} message - Message data (content, embeds)
 * @returns {Promise<Object>} Result object
 */
async function sendChannelMessage(guildId, channelType, message) {
  try {
    // Get Discord guild ID from mapping
    const discordGuildId = await getDiscordGuildId(guildId);
    if (!discordGuildId) {
      throw new Error('Discord guild not connected to this app guild');
    }
    
    // Get configured channel ID
    const channelId = await getConfiguredChannelId(guildId, channelType);
    if (!channelId) {
      throw new Error(`No ${channelType} channel configured for this guild`);
    }
    
    console.log(`Sending message to ${channelType} channel ${channelId} for guild ${guildId}`);
    
    // Send message via bot API
    const response = await botApi.post(
      `/api/channels/guilds/${discordGuildId}/channels/${channelId}/messages`,
      message
    );
    
    return response.data;
  } catch (error) {
    console.error('Error sending Discord message:', error.message);
    throw error;
  }
}

/**
 * Notify Discord about a new event
 * @param {string} guildId - Application guild ID
 * @param {string} eventId - Event ID
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Result object
 */
async function notifyNewEvent(guildId, eventId, eventData) {
  try {
    // Check if Discord notifications are enabled
    if (process.env.DISCORD_NOTIFICATIONS_ENABLED !== 'true') {
      console.log('Discord notifications are disabled. Skipping event notification.');
      return { success: false, message: 'Discord notifications are disabled' };
    }
    
    console.log(`Sending event webhook for event ${eventId} in guild ${guildId}`);
    
    // Send webhook to Discord bot service
    const response = await botApi.post('/api/webhooks/events', {
      guildId,
      eventId,
      eventData,
      secret: BOT_WEBHOOK_SECRET
    });
    
    return response.data;
  } catch (error) {
    console.error('Error notifying Discord about new event:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Notify Discord about a new item in storage
 * @param {string} guildId - Application guild ID
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Item data
 * @returns {Promise<Object>} Result object
 */
async function notifyNewItem(guildId, itemId, itemData) {
  try {
    // Check if Discord notifications are enabled
    if (process.env.DISCORD_NOTIFICATIONS_ENABLED !== 'true') {
      console.log('Discord notifications are disabled. Skipping item notification.');
      return { success: false, message: 'Discord notifications are disabled' };
    }
    
    console.log(`Sending item webhook for item ${itemId} in guild ${guildId}`);
    
    // Send webhook to Discord bot service
    const response = await botApi.post('/api/webhooks/items', {
      guildId,
      itemId,
      itemData,
      secret: BOT_WEBHOOK_SECRET
    });
    
    return response.data;
  } catch (error) {
    console.error('Error notifying Discord about new item:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Test Discord channel configuration
 * @param {string} guildId - Application guild ID
 * @returns {Promise<Object>} Result object
 */
async function testChannels(guildId) {
  try {
    // Get Discord guild ID from mapping
    const discordGuildId = await getDiscordGuildId(guildId);
    if (!discordGuildId) {
      throw new Error('Discord guild not connected to this app guild');
    }
    
    console.log(`Testing channels for guild ${guildId} (Discord ID: ${discordGuildId})`);
    
    // Get channel configurations
    const channelConfigs = await pool.query(
      `SELECT channel_type, channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND enabled = true`,
      [guildId]
    );
    
    if (!channelConfigs.rows.length) {
      throw new Error('No channel configurations found');
    }
    
    // Test each channel
    const results = {};
    
    for (const config of channelConfigs.rows) {
      try {
        const response = await botApi.post('/api/webhooks/test-channel', {
          guildId,
          discordGuildId,
          channelId: config.channel_id,
          channelType: config.channel_type,
          secret: BOT_WEBHOOK_SECRET
        });
        
        results[config.channel_type] = { 
          success: true,
          message_id: response.data.message_id 
        };
      } catch (err) {
        results[config.channel_type] = { 
          success: false, 
          error: err.message 
        };
      }
    }
    
    return { results };
  } catch (error) {
    console.error('Error testing Discord channels:', error.message);
    throw error;
  }
}

/**
 * Get Discord guild ID from application guild ID
 * @param {string} guildId - Application guild ID
 * @returns {Promise<string|null>} Discord guild ID or null
 */
async function getDiscordGuildId(guildId) {
  try {
    const result = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    return result.rows.length > 0 ? result.rows[0].discord_guild_id : null;
  } catch (error) {
    console.error('Error getting Discord guild ID:', error.message);
    return null;
  }
}

/**
 * Get configured channel ID for a specific type
 * @param {string} guildId - Application guild ID
 * @param {string} channelType - Channel type (events, storage, etc.)
 * @returns {Promise<string|null>} Channel ID or null
 */
async function getConfiguredChannelId(guildId, channelType) {
  try {
    const result = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = $2 AND enabled = true`,
      [guildId, channelType]
    );
    
    return result.rows.length > 0 ? result.rows[0].channel_id : null;
  } catch (error) {
    console.error('Error getting configured channel ID:', error.message);
    return null;
  }
}

/**
 * Get cached data
 * @param {string} type - Cache type (channels, roles)
 * @param {string} guildId - Application guild ID
 * @returns {Promise<Array|null>} Cached data or null
 */
async function getFromCache(type, guildId) {
  try {
    // Create table if it doesn't exist
    await ensureCacheTableExists();
    
    const result = await pool.query(
      `SELECT data, updated_at FROM discord_data_cache 
       WHERE guild_id = $1 AND type = $2`,
      [guildId, type]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const cache = result.rows[0];
    const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
    
    // Check if cache is still valid
    if (cacheAge < CACHE_DURATIONS[type.toUpperCase()]) {
      return JSON.parse(cache.data);
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting ${type} cache:`, error.message);
    return null;
  }
}

/**
 * Update cache with new data
 * @param {string} type - Cache type (channels, roles)
 * @param {string} guildId - Application guild ID
 * @param {Array} data - Data to cache
 * @returns {Promise<boolean>} Success status
 */
async function updateCache(type, guildId, data) {
  try {
    // Make sure cache table exists
    await ensureCacheTableExists();
    
    // Upsert cache entry
    await pool.query(
      `INSERT INTO discord_data_cache (guild_id, type, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (guild_id, type) 
       DO UPDATE SET data = $3, updated_at = NOW()`,
      [guildId, type, JSON.stringify(data)]
    );
    
    return true;
  } catch (error) {
    console.error(`Error updating ${type} cache:`, error.message);
    return false;
  }
}

/**
 * Ensure cache table exists
 * @returns {Promise<boolean>} Success status
 */
async function ensureCacheTableExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discord_data_cache (
        id SERIAL PRIMARY KEY,
        guild_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(guild_id, type)
      )
    `);
    
    return true;
  } catch (error) {
    console.error('Error creating cache table:', error.message);
    return false;
  }
}

module.exports = {
  checkHealth,
  getDiscordChannels,
  getDiscordRoles,
  sendChannelMessage,
  notifyNewEvent,
  notifyNewItem,
  testChannels,
  getDiscordGuildId,
  getConfiguredChannelId
};