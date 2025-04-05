const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');

// Database connection
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_USE_SSL === 'true' ? { rejectUnauthorized: false } : false
    })
  : null;

/**
 * Get Discord roles for a guild
 * GET /api/guilds/:guildId/discord/roles
 */
router.get('/guilds/:guildId/discord/roles', async (req, res) => {
  console.log(`[Discord Roles API] Fetching roles for guild: ${req.params.guildId}`);
  
  // Set proper content type header
  res.header('Content-Type', 'application/json');
  
  try {
    const { guildId } = req.params;
    
    // Get Discord guild ID from mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      console.log(`[Discord Roles API] No Discord mapping found for guild ${guildId}`);
      return res.status(404).json({ 
        error: 'Discord guild mapping not found',
        message: 'This guild is not connected to Discord yet'
      });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    console.log(`[Discord Roles API] Found Discord guild ID: ${discordGuildId}`);
    
    // Get Discord bot token
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.log('[Discord Roles API] No bot token configured');
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }
    
    try {
      // Fetch roles from Discord API
      console.log(`[Discord Roles API] Requesting roles from Discord API for guild: ${discordGuildId}`);
      const response = await axios.get(`https://discord.com/api/v10/guilds/${discordGuildId}/roles`, {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        console.error('[Discord Roles API] Invalid response format from Discord API:', response.data);
        return res.status(500).json({ error: 'Invalid response from Discord API' });
      }
      
      console.log(`[Discord Roles API] Received ${response.data.length} roles from Discord API`);
      return res.status(200).json(response.data);
    } catch (discordError) {
      console.error('[Discord Roles API] Error calling Discord API:', 
        discordError.response?.data || discordError.message);
      
      // If Discord API fails, return mock data for testing/development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Discord Roles API] Using mock roles data for development');
        const mockRoles = [
          { id: 'mock1', name: 'Admin', color: 0xFF0000, position: 3 },
          { id: 'mock2', name: 'Moderator', color: 0x00FF00, position: 2 },
          { id: 'mock3', name: 'Member', color: 0x0000FF, position: 1 },
          { id: 'mock4', name: '@everyone', color: 0x000000, position: 0 }
        ];
        return res.status(200).json(mockRoles);
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch Discord roles',
        details: discordError.response?.data?.message || discordError.message
      });
    }
  } catch (error) {
    console.error('[Discord Roles API] Error in role fetch handler:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

/**
 * Get role ping configurations for a guild
 * GET /api/guilds/:guildId/discord/role-ping-configs
 */
router.get('/guilds/:guildId/discord/role-ping-configs', async (req, res) => {
  console.log(`[Discord Roles API] Fetching role ping configs for guild: ${req.params.guildId}`);
  
  try {
    const { guildId } = req.params;
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_role_ping_config'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('[Discord Roles API] Table discord_role_ping_config does not exist');
      return res.status(200).json([]);
    }
    
    // Query existing configurations
    const result = await pool.query(
      `SELECT * FROM discord_role_ping_config WHERE guild_id = $1`,
      [guildId]
    );
    
    console.log(`[Discord Roles API] Found ${result.rows.length} role ping configurations`);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('[Discord Roles API] Error fetching role ping configs:', error);
    return res.status(500).json({ error: 'Failed to fetch role ping configurations' });
  }
});

/**
 * Save role ping configurations for a guild
 * POST /api/guilds/:guildId/discord/role-ping-configs
 */
router.post('/guilds/:guildId/discord/role-ping-configs', async (req, res) => {
  console.log(`[Discord Roles API] Saving role ping configs for guild: ${req.params.guildId}`);
  console.log('[Discord Roles API] Request body:', req.body);
  
  try {
    const { guildId } = req.params;
    const configurations = req.body;
    
    if (!Array.isArray(configurations)) {
      return res.status(400).json({ error: 'Invalid request format. Expected array of configurations.' });
    }
    
    // Check if table exists, create if it doesn't
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_role_ping_config'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('[Discord Roles API] Creating discord_role_ping_config table');
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
          console.warn('[Discord Roles API] Skipping invalid config item:', config);
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
      
      console.log('[Discord Roles API] Role ping configurations saved successfully');
      return res.status(200).json({ success: true, message: 'Configurations saved successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Discord Roles API] Error saving role ping configs:', error);
    return res.status(500).json({ error: 'Failed to save role ping configurations' });
  }
});

module.exports = router;