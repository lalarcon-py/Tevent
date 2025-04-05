/**
 * Direct Discord Roles Route
 * A simplified, direct approach to fetch Discord roles using axios instead of discord.js
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

/**
 * Get Discord roles directly via Discord REST API
 * GET /api/direct/guilds/:guildId/discord/roles
 */
router.get('/guilds/:guildId/discord/roles', async (req, res) => {
  try {
    console.log(`[DIRECT ROLES] Starting role fetch for guild: ${req.params.guildId}`);
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get Discord guild ID from database
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [req.params.guildId]
    );
    
    if (!mappingResult.rows.length) {
      console.log(`[DIRECT ROLES] No Discord mapping found for guild ${req.params.guildId}`);
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    console.log(`[DIRECT ROLES] Found Discord guild ID: ${discordGuildId}`);
    
    // Get the bot token
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.error('[DIRECT ROLES] Discord bot token not found in environment variables');
      return res.status(500).json({ error: 'Discord bot token not configured' });
    }
    
    // Call Discord API directly
    console.log(`[DIRECT ROLES] Calling Discord API for roles in guild ${discordGuildId}`);
    
    const response = await axios.get(`https://discord.com/api/v10/guilds/${discordGuildId}/roles`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error('[DIRECT ROLES] Invalid response from Discord API:', response.data);
      return res.status(500).json({ error: 'Invalid response from Discord API' });
    }
    
    console.log(`[DIRECT ROLES] Received ${response.data.length} roles from Discord API`);
    
    // Format roles
    const formattedRoles = [];
    
    for (const role of response.data) {
      // Skip @everyone role
      if (role.name !== '@everyone') {
        formattedRoles.push({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          managed: role.managed,
          mentionable: role.mentionable
        });
      }
    }
    
    // Sort roles by position (highest first)
    formattedRoles.sort((a, b) => b.position - a.position);
    
    console.log(`[DIRECT ROLES] Returning ${formattedRoles.length} formatted roles`);
    
    // Return the roles
    res.json(formattedRoles);
  } catch (error) {
    console.error(`[DIRECT ROLES] Error fetching roles:`, error);
    
    // Provide detailed error information
    res.status(500).json({ 
      error: 'Failed to fetch Discord roles',
      message: error.message,
      tokenInfo: process.env.DISCORD_BOT_TOKEN ? 
        `Token exists, length: ${process.env.DISCORD_BOT_TOKEN.length}` : 
        'Token missing'
    });
  }
});

module.exports = router;