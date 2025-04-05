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
 * Get role ping configurations for a guild
 * GET /api/guilds/:guildId/discord/role-ping-configs
 */
router.get('/guilds/:guildId/discord/role-ping-configs', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_role_ping_config'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('[Discord API] Table discord_role_ping_config does not exist');
      return res.status(200).json([]);
    }
    
    // Query existing configurations
    const result = await pool.query(
      `SELECT * FROM discord_role_ping_config WHERE guild_id = $1`,
      [guildId]
    );
    
    console.log(`[Discord API] Found ${result.rows.length} role ping configurations`);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('[Discord API] Error fetching role ping configs:', error);
    return res.status(500).json({ error: 'Failed to fetch role ping configurations' });
  }
});

/**
 * Save role ping configurations for a guild
 * POST /api/guilds/:guildId/discord/role-ping-configs
 */
router.post('/guilds/:guildId/discord/role-ping-configs', async (req, res) => {
  try {
    const { guildId } = req.params;
    const configurations = req.body;
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check if table exists, create if it doesn't
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_role_ping_config'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('[Discord API] Creating discord_role_ping_config table');
      await pool.query(`
        CREATE TABLE discord_role_ping_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          role_ids TEXT[] DEFAULT '{}',
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(guild_id, type)
        );
        
        CREATE INDEX idx_discord_role_ping_config_guild_id 
        ON discord_role_ping_config(guild_id);
      `);
    }
    
    // Use a transaction to ensure all updates are atomic
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Process each configuration
      for (const config of configurations) {
        const { type, role_ids, enabled = true } = config;
        
        if (!type || !role_ids) {
          console.warn('[Discord API] Skipping invalid config item:', config);
          continue;
        }
        
        // Check if configuration exists
        const existingResult = await client.query(
          `SELECT id FROM discord_role_ping_config 
           WHERE guild_id = $1 AND type = $2`,
          [guildId, type]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing config
          await client.query(
            `UPDATE discord_role_ping_config 
             SET role_ids = $1, enabled = $2, updated_at = NOW()
             WHERE guild_id = $3 AND type = $4`,
            [role_ids, enabled, guildId, type]
          );
        } else {
          // Insert new config
          await client.query(
            `INSERT INTO discord_role_ping_config 
             (id, guild_id, type, role_ids, enabled, created_at, updated_at)
             VALUES 
             (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
            [guildId, type, role_ids, enabled]
          );
        }
      }
      
      await client.query('COMMIT');
      
      console.log('[Discord API] Role ping configurations saved successfully');
      return res.status(200).json({ success: true, message: 'Configurations saved successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Discord API] Error saving role ping configs:', error);
    return res.status(500).json({ error: 'Failed to save role ping configurations' });
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