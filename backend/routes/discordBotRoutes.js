// Add to backend/routes/discordBotRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Get all guild mappings
router.get('/guild-mappings', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== 'Bot') {
      return res.status(403).json({ error: 'Bot authentication required' });
    }
    
    const mappings = await db.DiscordGuildMapping.findAll();
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching guild mappings:', error);
    res.status(500).json({ error: 'Failed to fetch guild mappings' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Check if mapping exists in database
    const result = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    res.json({
      connected: result.rows.length > 0,
      discordGuildId: result.rows[0]?.discord_guild_id || null
    });
  } catch (error) {
    console.error('Error checking Discord status:', error);
    res.status(500).json({ error: 'Failed to check Discord connection status' });
  }
});

router.get('/servers', async (req, res) => {
  try {
    // For simplicity, find the Discord guild ID from the mapping and return it
    const { guildId } = req.query;
    
    const result = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!result.rows.length) {
      return res.json([]);
    }
    
    // Try to get guild info from Discord API
    try {
      const discordGuildId = result.rows[0].discord_guild_id;
      // You would normally use Discord API here, but for now return basic info
      res.json([{
        id: discordGuildId,
        name: "Connected Discord Server"
      }]);
    } catch (err) {
      console.error('Error fetching Discord guild info:', err);
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching Discord servers:', error);
    res.status(500).json({ error: 'Failed to fetch Discord servers' });
  }
});

// Link a Discord server to an application guild
router.post('/link-guild', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== 'Bot') {
      return res.status(403).json({ error: 'Bot authentication required' });
    }
    
    const { discordGuildId, appGuildId } = req.body;
    
    if (!discordGuildId || !appGuildId) {
      return res.status(400).json({ error: 'Discord guild ID and app guild ID are required' });
    }
    
    // Check if the app guild exists
    const guild = await db.Guild.findByPk(appGuildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Check if the guild is active
    if (guild.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Guild is not active' });
    }
    
    // Check if mapping already exists
    let mapping = await db.DiscordGuildMapping.findOne({
      where: { discord_guild_id: discordGuildId }
    });
    
    if (mapping) {
      // Update existing mapping
      await mapping.update({ app_guild_id: appGuildId });
    } else {
      // Create new mapping
      mapping = await db.DiscordGuildMapping.create({
        discord_guild_id: discordGuildId,
        app_guild_id: appGuildId
      });
    }
    
    res.json({ success: true, mapping });
  } catch (error) {
    console.error('Error linking guild:', error);
    res.status(500).json({ error: 'Failed to link guild' });
  }
});

// Verify if a guild exists and is active
router.get('/guilds/:guildId/verify', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== 'Bot') {
      return res.status(403).json({ error: 'Bot authentication required' });
    }
    
    const { guildId } = req.params;
    
    const guild = await db.Guild.findByPk(guildId);
    
    if (!guild) {
      return res.json({ valid: false });
    }
    
    res.json({
      valid: true,
      guildName: guild.name,
      guildStatus: guild.status
    });
  } catch (error) {
    console.error('Error verifying guild:', error);
    res.status(500).json({ error: 'Failed to verify guild' });
  }
});

router.post('/announce-teams', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { eventId, guildId, teams } = req.body;
    
    if (!eventId || !guildId || !teams) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log(`Starting team announcement for event ${eventId} in guild ${guildId}`);
    
    // Get event details
    const event = await db.Event.findOne({
      where: { 
        id: eventId,
        guild_id: guildId
      }
    });
    
    if (!event) {
      console.error(`Event not found: ${eventId}`);
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Format the event and team data
    const eventData = {
      id: event.id,
      title: event.title,
      description: event.description,
      event_time: event.event_time,
      location: event.location
    };
    
    // IMPORTANT: Use the Railway internal URL like in your events.js
    const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
    
    try {
      console.log(`Sending team announcement to Discord bot: ${discordBotUrl}/webhook/announce-teams`);
      
      // Send to Discord bot using the same approach as your working events code
      await axios.post(`${discordBotUrl}/webhook/announce-teams`, {
        guildId,
        eventId,
        eventData,
        teams,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`Successfully sent team announcement to Discord bot`);
      res.json({ success: true });
    } catch (webhookError) {
      // Log error but don't fail the request completely - similar to your event code
      console.error('Failed to notify Discord bot about teams:', {
        message: webhookError.message,
        stack: webhookError.stack,
        response: webhookError.response?.data
      });
      
      return res.status(500).json({ 
        error: 'Failed to send team announcement to Discord',
        details: webhookError.message
      });
    }
  } catch (error) {
    console.error('Error announcing teams:', error);
    res.status(500).json({ 
      error: 'Failed to announce teams',
      details: error.message 
    });
  }
});

// Check if guild is connected to Discord
router.get('/guild-mapping/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Direct query to the discord_guild_mappings table
    const result = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    // If we found a row, the guild is connected to Discord
    const isConnected = result.rows.length > 0;
    
    res.json({
      connected: isConnected,
      discordGuildId: isConnected ? result.rows[0].discord_guild_id : null
    });
  } catch (error) {
    console.error('Error checking guild Discord connection:', error);
    res.status(500).json({ error: 'Failed to check guild Discord connection' });
  }
});

module.exports = router;