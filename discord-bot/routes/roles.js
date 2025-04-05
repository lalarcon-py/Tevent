/**
 * Roles API for Discord Bot
 * Provides endpoints for fetching Discord guild roles
 */
const express = require('express');
const router = express.Router();

/**
 * Get all roles for a Discord guild
 * GET /api/guilds/:guildId/roles
 */
router.get('/guilds/:guildId/roles', async (req, res) => {
  try {
    console.log(`[ROLES API] Fetching roles for guild: ${req.params.guildId}`);
    
    // Get the Discord client from the app
    const client = req.app.locals.client;
    
    if (!client) {
      console.error('[ROLES API] Discord client not available');
      return res.status(503).json({
        error: 'Discord client not available',
        details: 'Bot service is not properly initialized'
      });
    }
    
    if (!client.isReady()) {
      console.error('[ROLES API] Discord client not ready');
      return res.status(503).json({
        error: 'Discord client not ready',
        details: 'Bot is still connecting to Discord'
      });
    }
    
    // Try to fetch the guild
    const guild = await client.guilds.fetch(req.params.guildId).catch(err => {
      console.error(`[ROLES API] Error fetching guild: ${err.message}`);
      return null;
    });
    
    if (!guild) {
      console.error(`[ROLES API] Guild not found: ${req.params.guildId}`);
      return res.status(404).json({
        error: 'Guild not found',
        details: 'The bot may not be in this server or the ID is incorrect'
      });
    }
    
    console.log(`[ROLES API] Successfully fetched guild: ${guild.name}`);
    
    // Fetch all roles
    const roles = await guild.roles.fetch();
    console.log(`[ROLES API] Fetched ${roles.size} roles for guild ${guild.name}`);
    
    // Format roles for response
    const formattedRoles = [];
    roles.forEach(role => {
      // Skip @everyone role if desired
      // if (role.name === '@everyone') return;
      
      formattedRoles.push({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        managed: role.managed,
        mentionable: role.mentionable
      });
    });
    
    // Sort roles by position (highest first)
    formattedRoles.sort((a, b) => b.position - a.position);
    
    console.log(`[ROLES API] Returning ${formattedRoles.length} formatted roles`);
    return res.json(formattedRoles);
  } catch (error) {
    console.error(`[ROLES API] Error:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;