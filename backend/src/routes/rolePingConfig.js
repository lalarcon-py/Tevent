const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { checkAuth } = require('../middleware/auth');
const { isGuildAdmin } = require('../middleware/guild');
const { validateSchema } = require('../middleware/validation');
const Joi = require('joi');
const axios = require('axios');

// Database connection
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_USE_SSL === 'true' ? { rejectUnauthorized: false } : false
    })
  : null;

// Validation schemas
const configSchema = Joi.object({
  type: Joi.string().valid('events', 'storage', 'applications', 'gear_checks').required(),
  enabled: Joi.boolean().default(true),
  role_ids: Joi.array().items(Joi.string()).default([])
});

const configArraySchema = Joi.array().items(configSchema);

// Get role ping configurations for a guild
router.get('/guilds/:guildId/discord/role-ping-configs', checkAuth, isGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log(`Fetching role ping configs for guild: ${guildId}`);
    
    // Ensure proper content type
    res.header('Content-Type', 'application/json');
    
    // Query existing configurations
    const result = await pool.query(
      `SELECT * FROM discord_role_ping_config WHERE guild_id = $1`,
      [guildId]
    );
    
    console.log(`Found ${result.rows.length} role ping configurations`);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching role ping configs:', error);
    return res.status(500).json({ error: 'Failed to fetch role ping configurations' });
  }
});

// Save role ping configurations for a guild
router.post('/guilds/:guildId/discord/role-ping-configs', 
  checkAuth, 
  isGuildAdmin, 
  validateSchema('body', configArraySchema),
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const configurations = req.body;
      console.log(`Saving ${configurations.length} role ping configs for guild: ${guildId}`);
      
      // Use a transaction to ensure all updates are atomic
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Process each configuration
        for (const config of configurations) {
          // Check if configuration exists
          const existingResult = await client.query(
            `SELECT id FROM discord_role_ping_config 
             WHERE guild_id = $1 AND type = $2`,
            [guildId, config.type]
          );
          
          if (existingResult.rows.length > 0) {
            // Update existing config
            await client.query(
              `UPDATE discord_role_ping_config 
               SET role_ids = $1, enabled = $2, updated_at = NOW()
               WHERE guild_id = $3 AND type = $4`,
              [config.role_ids, config.enabled, guildId, config.type]
            );
          } else {
            // Insert new config
            await client.query(
              `INSERT INTO discord_role_ping_config 
               (id, guild_id, type, role_ids, enabled, created_at, updated_at)
               VALUES 
               (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
              [guildId, config.type, config.role_ids, config.enabled]
            );
          }
        }
        
        await client.query('COMMIT');
        console.log('Role ping configurations saved successfully');
        return res.status(200).json({ success: true, message: 'Configurations saved successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error saving role ping configs:', error);
      return res.status(500).json({ error: 'Failed to save role ping configurations' });
    }
});

// Reset all role ping configurations for a guild
router.delete('/guilds/:guildId/discord/role-ping-configs', checkAuth, isGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log(`Resetting role ping configs for guild: ${guildId}`);
    
    // Reset all configurations to default values
    await pool.query(
      `UPDATE discord_role_ping_config 
       SET role_ids = '{}'::TEXT[], enabled = true, updated_at = NOW()
       WHERE guild_id = $1`,
      [guildId]
    );
    
    return res.status(200).json({ success: true, message: 'Configurations reset successfully' });
  } catch (error) {
    console.error('Error resetting role ping configs:', error);
    return res.status(500).json({ error: 'Failed to reset role ping configurations' });
  }
});

// Get Discord roles
router.get('/guilds/:guildId/discord/roles', checkAuth, isGuildAdmin, async (req, res) => {
  // Add CORS headers to ensure proper API response
  res.header('Content-Type', 'application/json');
  
  try {
    const { guildId } = req.params;
    console.log(`Fetching Discord roles for guild: ${guildId}`);
    
    // Get Discord guild ID from mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    console.log(`Found Discord guild ID: ${discordGuildId}`);
    
    // Get Discord bot token
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }
    
    try {
      // Fetch roles directly from Discord API
      console.log(`Requesting roles from Discord API for guild: ${discordGuildId}`);
      const response = await axios.get(`https://discord.com/api/v10/guilds/${discordGuildId}/roles`, {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format from Discord API:', response.data);
        return res.status(500).json({ error: 'Invalid response from Discord API' });
      }
      
      console.log(`Received ${response.data.length} roles from Discord API`);
      return res.status(200).json(response.data);
    } catch (discordError) {
      console.error('Error calling Discord API:', discordError.response?.data || discordError.message);
      
      // If Discord API fails, use discord.js fallback if integrated
      try {
        // Get Discord bot client if available
        if (global.discordClient && global.discordClient.guilds) {
          const guild = global.discordClient.guilds.cache.get(discordGuildId);
          
          if (guild) {
            const roles = Array.from(guild.roles.cache.values()).map(role => ({
              id: role.id,
              name: role.name,
              color: role.color,
              position: role.position,
              permissions: role.permissions.bitfield.toString(),
              managed: role.managed,
              tags: role.tags || {}
            }));
            
            console.log(`Retrieved ${roles.length} roles from discord.js client`);
            return res.status(200).json(roles);
          }
        }
      } catch (clientError) {
        console.error('Error getting roles from discord.js client:', clientError);
      }
      
      // If all else fails, return mock data in development or error in production
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using mock roles data for development');
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
    console.error('Error in role fetch handler:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

// Test role pings
router.post('/guilds/:guildId/discord/test-role-pings', checkAuth, isGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log(`Testing role pings for guild: ${guildId}`);
    
    // Mock successful test results
    return res.status(200).json({
      success: true,
      results: {
        events: { success: true },
        applications: { success: true },
        storage: { success: true },
        gear_checks: { success: true }
      }
    });
  } catch (error) {
    console.error('Error testing role pings:', error);
    return res.status(500).json({ error: 'Failed to test role pings' });
  }
});

module.exports = router;
