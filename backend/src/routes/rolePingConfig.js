const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { checkAuth } = require('../middleware/auth');
const { isGuildAdmin } = require('../middleware/guild');
const { validateSchema } = require('../middleware/validation');
const Joi = require('joi');

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
    
    // Query existing configurations
    const result = await pool.query(
      `SELECT * FROM discord_role_ping_config WHERE guild_id = $1`,
      [guildId]
    );
    
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
  try {
    const { guildId } = req.params;
    
    // Get Discord guild ID from mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get Discord bot token
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }
    
    // Fetch roles from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${discordGuildId}/roles`, {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    const roles = await response.json();
    
    return res.status(200).json(roles);
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

module.exports = router;
