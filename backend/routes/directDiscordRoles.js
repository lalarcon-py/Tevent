/**
 * Direct Discord Roles Route
 * A simplified, direct approach to fetch Discord roles
 */
const express = require('express');
const router = express.Router();
const { Client, GatewayIntentBits } = require('discord.js');
const { Pool } = require('pg');

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

/**
 * Get Discord roles directly, bypassing the Discord bot service
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
    
    // Create a new Discord client instance with all relevant intents
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
      ]
    });
    
    // Log in to Discord
    console.log(`[DIRECT ROLES] Logging in to Discord...`);
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`[DIRECT ROLES] Logged in as ${client.user.tag}`);
    
    // Fetch the guild
    console.log(`[DIRECT ROLES] Fetching guild ${discordGuildId}...`);
    const guild = await client.guilds.fetch(discordGuildId);
    
    if (!guild) {
      console.log(`[DIRECT ROLES] Could not find guild ${discordGuildId}`);
      await client.destroy();
      return res.status(404).json({ error: 'Discord guild not found' });
    }
    
    console.log(`[DIRECT ROLES] Successfully fetched guild: ${guild.name}`);
    
    // Fetch all roles
    console.log(`[DIRECT ROLES] Fetching roles for ${guild.name}...`);
    const roles = await guild.roles.fetch();
    console.log(`[DIRECT ROLES] Fetched ${roles.size} roles`);
    
    // Format roles
    const formattedRoles = [];
    roles.forEach(role => {
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
    });
    
    // Sort roles by position (highest first)
    formattedRoles.sort((a, b) => b.position - a.position);
    
    console.log(`[DIRECT ROLES] Returning ${formattedRoles.length} formatted roles`);
    
    // Clean up Discord client
    await client.destroy();
    
    // Return the roles
    res.json(formattedRoles);
  } catch (error) {
    console.error(`[DIRECT ROLES] Error fetching roles:`, error);
    
    // Provide detailed error information
    res.status(500).json({ 
      error: 'Failed to fetch Discord roles',
      message: error.message,
      stack: error.stack,
      tokenInfo: process.env.DISCORD_BOT_TOKEN ? 
        `Token exists, length: ${process.env.DISCORD_BOT_TOKEN.length}` : 
        'Token missing'
    });
  }
});

module.exports = router;