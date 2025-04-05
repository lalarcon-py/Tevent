/**
 * Discord Integration Routes
 * Handles all routes related to Discord integration
 */
const express = require('express');
const router = express.Router();
const discordService = require('../services/discordService');
const { Pool } = require('pg');

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

/**
 * Get Discord integration status for a guild
 * GET /api/guilds/:guildId/discord/status
 */
router.get('/guilds/:guildId/discord/status', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get Discord guild ID from database
    const discordGuildId = await discordService.getDiscordGuildId(guildId);
    
    // Check bot service health
    let serviceStatus = { status: 'unknown' };
    try {
      serviceStatus = await discordService.checkHealth();
    } catch (healthError) {
      console.warn('Could not check Discord bot health:', healthError.message);
    }
    
    res.json({
      connected: !!discordGuildId,
      discordGuildId: discordGuildId,
      serviceStatus
    });
  } catch (error) {
    console.error('Error checking Discord status:', error);
    res.status(500).json({ error: 'Failed to check Discord connection status' });
  }
});

/**
 * Get Discord channels for a guild
 * GET /api/guilds/:guildId/discord/channels
 */
router.get('/guilds/:guildId/discord/channels', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const channels = await discordService.getDiscordChannels(guildId);
    res.json(channels);
  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    res.status(500).json({ error: 'Failed to fetch Discord channels' });
  }
});

/**
 * Get Discord roles for a guild
 * GET /api/guilds/:guildId/discord/roles
 */
router.get('/guilds/:guildId/discord/roles', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const roles = await discordService.getDiscordRoles(guildId);
    res.json(roles);
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

/**
 * Get channel configuration for a guild
 * GET /api/guilds/:guildId/discord/channel-config
 */
router.get('/guilds/:guildId/discord/channel-config', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get the Discord guild ID
    const discordGuildId = await discordService.getDiscordGuildId(guildId);
    
    if (!discordGuildId) {
      return res.status(404).json({ 
        error: 'Discord integration not found',
        message: 'This guild is not connected to Discord'
      });
    }
    
    // Get channel configurations
    const channelConfigs = await pool.query(
      `SELECT channel_type, channel_id, enabled 
       FROM discord_channel_config
       WHERE guild_id = $1`,
      [guildId]
    );
    
    // Format configurations
    const configurations = channelConfigs.rows.map(config => ({
      channel_type: config.channel_type,
      channel_id: config.channel_id,
      enabled: config.enabled
    }));
    
    res.json({ 
      discordGuildId,
      configurations 
    });
  } catch (error) {
    console.error('Error getting channel config:', error);
    res.status(500).json({ error: 'Failed to get channel configuration' });
  }
});

/**
 * Save channel configuration for a guild
 * POST /api/guilds/:guildId/discord/channel-config
 */
router.post('/guilds/:guildId/discord/channel-config', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { configurations } = req.body;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get the Discord guild ID
    const discordGuildId = await discordService.getDiscordGuildId(guildId);
    
    if (!discordGuildId) {
      return res.status(404).json({ 
        error: 'Discord integration not found',
        message: 'This guild is not connected to Discord'
      });
    }
    
    // Delete existing configurations
    await pool.query(
      `DELETE FROM discord_channel_config WHERE guild_id = $1`,
      [guildId]
    );
    
    // Insert new configurations
    for (const config of configurations) {
      await pool.query(
        `INSERT INTO discord_channel_config 
         (guild_id, discord_guild_id, channel_type, channel_id, enabled)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          guildId, 
          discordGuildId, 
          config.channel_type, 
          config.channel_id, 
          config.enabled !== false
        ]
      );
    }
    
    // Invalidate channel cache
    try {
      await pool.query(
        `DELETE FROM discord_data_cache 
         WHERE guild_id = $1 AND type = 'channels'`,
        [guildId]
      );
    } catch (cacheError) {
      console.warn('Failed to invalidate channel cache:', cacheError.message);
    }
    
    res.json({ 
      success: true,
      message: 'Channel configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving channel config:', error);
    res.status(500).json({ error: 'Failed to save channel configuration' });
  }
});

/**
 * Test channel configuration for a guild
 * POST /api/guilds/:guildId/discord/test-channels
 */
router.post('/guilds/:guildId/discord/test-channels', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const results = await discordService.testChannels(guildId);
    res.json(results);
  } catch (error) {
    console.error('Error testing Discord channels:', error);
    res.status(500).json({ 
      error: 'Failed to test Discord channels',
      message: error.message
    });
  }
});

/**
 * Disconnect Discord integration for a guild
 * DELETE /api/guilds/:guildId/discord
 */
router.delete('/guilds/:guildId/discord', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Delete channel configurations
    await pool.query(
      `DELETE FROM discord_channel_config WHERE guild_id = $1`,
      [guildId]
    );
    
    // Delete guild mapping
    await pool.query(
      `DELETE FROM discord_guild_mappings WHERE app_guild_id = $1`,
      [guildId]
    );
    
    // Delete cached data
    try {
      await pool.query(
        `DELETE FROM discord_data_cache WHERE guild_id = $1`,
        [guildId]
      );
    } catch (cacheError) {
      console.warn('Failed to delete Discord cache:', cacheError.message);
    }
    
    res.json({ 
      success: true,
      message: 'Discord integration disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Discord:', error);
    res.status(500).json({ error: 'Failed to disconnect Discord integration' });
  }
});

module.exports = router;