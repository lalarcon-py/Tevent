// backend/routes/discordBotRoutes.js - Updated
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


// Discord bot service configuration
const DISCORD_BOT_URL = process.env.NODE_ENV === 'production' 
  ? "http://heartfelt-sparkle.railway.internal:3300" 
  : "http://localhost:3300";

const DISCORD_BOT_AUTH = process.env.BOT_WEBHOOK_SECRET || 'default-secret';


async function callDiscordBot(endpoint, method = 'GET', data = null) {
  try {
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    const url = `${DISCORD_BOT_URL}${endpoint}`;
    console.log(`Making ${method} request to Discord bot: ${url}`);
    
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${DISCORD_BOT_AUTH}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error calling Discord bot:', error.message);
    if (error.response) {
      console.error('Discord bot response:', error.response.data);
    }
    throw error;
  }
}

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

app.post('/webhook/announce-teams-with-images', async (req, res) => {
  try {
    const { guildId, eventId, eventData, teams, teamImages, secret } = req.body;
    
    console.log(`[INFO] Received announce teams with images webhook - Guild: ${guildId}, Event: ${eventId}`);
    
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      console.error(`[ERROR] Invalid webhook secret provided`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get Discord guild ID from mapping
    const mappingResult = await pool.query(
      'SELECT discord_guild_id FROM discord_guild_mappings WHERE app_guild_id = $1',
      [guildId]
    );
    
    if (!mappingResult.rows.length) {
      console.error(`[ERROR] Discord guild mapping not found for guild: ${guildId}`);
      return res.status(404).json({ error: 'Discord guild mapping not found' });
    }
    
    const discordGuildId = mappingResult.rows[0].discord_guild_id;
    
    // Get channel configuration
    const channelConfigResult = await pool.query(
      `SELECT channel_id FROM discord_channel_config 
       WHERE guild_id = $1 AND channel_type = 'events' AND enabled = true`,
      [guildId]
    );
    
    if (!channelConfigResult.rows.length) {
      console.error(`[ERROR] No events channel configured for guild: ${guildId}`);
      return res.status(404).json({ error: 'No events channel configured' });
    }
    
    const channelId = channelConfigResult.rows[0].channel_id;
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error(`[ERROR] Channel not found: ${channelId}`);
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    try {
      // Format date and time for the event header
      const eventDate = new Date(eventData.event_time);
      const dateFormatted = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const timeFormatted = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      // Create the team image attachment
      const imageBuffer = Buffer.from(
        teamImages[0].image.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );
      
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'teams.jpg' });
      
      // Create an embed with the event info and the image
      const eventEmbed = new EmbedBuilder()
        .setTitle(`📋 ${eventData.title} - Team Assignments`)
        .setDescription(
          `📅 **Event:** ${dateFormatted} at ${timeFormatted}\n` +
          `📍 **Location:** ${eventData.location || 'Not specified'}\n\n` +
          (eventData.description ? `${eventData.description}\n\n` : '')
        )
        .setImage('attachment://teams.jpg')
        .setColor('#1a64f3')
        .setTimestamp();
      
      // Send a single message with the embed and attachment
      await channel.send({
        embeds: [eventEmbed],
        files: [attachment]
      });
      
      console.log(`[INFO] Team screenshots sent successfully for event ${eventId}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`[ERROR] Error sending team screenshots: ${error.message}`);
      console.error(error.stack);
      return res.status(500).json({ 
        error: 'Error sending to channel',
        details: error.message
      });
    }
  } catch (error) {
    console.error(`[ERROR] Error processing team screenshots webhook: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
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


router.get('/channels', async (req, res) => {
  try {
    const { guildId, discordGuildId } = req.query;
    
    if (!guildId || !discordGuildId) {
      return res.status(400).json({ error: 'Guild ID and Discord Guild ID are required' });
    }
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated() || req.user.role === 'Bot') {
      const member = await db.GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master'
        }
      });
      
      if (!member) {
        return res.status(403).json({ error: 'You must be the Guild Master to access Discord channels' });
      }
    }
    
    // Make sure this Discord guild is connected to this app guild
    const mapping = await db.DiscordGuildMapping.findOne({
      where: { 
        app_guild_id: guildId,
        discord_guild_id: discordGuildId
      }
    });
    
    if (!mapping) {
      return res.status(404).json({ error: 'Discord guild not connected to this app guild' });
    }
    
    let channelsData = [];
    
    try {
      console.log(`Fetching channels from Discord bot webhook endpoint`);
      const discordBotResponse = await axios.post(`${DISCORD_BOT_URL}/webhook/channels`, {
        guildId: guildId,
        discordGuildId: discordGuildId,
        secret: DISCORD_BOT_AUTH
      });
      
      if (discordBotResponse.data && Array.isArray(discordBotResponse.data)) {
        // Filter and format channels
        channelsData = discordBotResponse.data
          .filter(channel => channel.type === 0) // Only text channels
          .map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            parent_id: channel.parent_id,
            position: channel.position
          }));
        
        console.log(`Found ${channelsData.length} text channels`);
      } else {
        throw new Error('Invalid response format from Discord bot');
      }
    } catch (discordError) {
      console.error('Error fetching channels from Discord bot:', discordError);
      console.log('Falling back to mock channel data');
      
      // Use mock data when Discord bot request fails
      channelsData = [
        { id: 'mock-general', name: 'general (mock)', type: 0 },
        { id: 'mock-events', name: 'events (mock)', type: 0 },
        { id: 'mock-announcements', name: 'announcements (mock)', type: 0 },
        { id: 'mock-bot-commands', name: 'bot-commands (mock)', type: 0 }
      ];
    }
    
    // Always return channel data, whether real or mock
    return res.json(channelsData);
  } catch (error) {
    console.error('Error in /channels endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch Discord channels' });
  }
});


router.get('/channel-config', async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated() || req.user.role === 'Bot') {
      const member = await db.GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master'
        }
      });
      
      if (!member) {
        return res.status(403).json({ error: 'You must be the Guild Master to access Discord channel config' });
      }
    }
    
    // Get the Discord guild mapping for this app guild
    const mapping = await db.DiscordGuildMapping.findOne({
      where: { app_guild_id: guildId }
    });
    
    if (!mapping) {
      return res.status(404).json({ error: 'Discord guild not connected to this app guild' });
    }
    
    // Get channel configurations
    const channelConfigs = await db.DiscordChannelConfig.findAll({
      where: { guild_id: guildId }
    });
    
    // Format configurations
    const configurations = channelConfigs.map(config => ({
      channel_type: config.channel_type,
      channel_id: config.channel_id,
      enabled: config.enabled
    }));
    
    res.json({ 
      discordGuildId: mapping.discord_guild_id,
      configurations 
    });
  } catch (error) {
    console.error('Error getting channel config:', error);
    res.status(500).json({ error: 'Failed to get channel configuration' });
  }
});

// NEW ENDPOINT: Save channel configuration
router.post('/channel-config', async (req, res) => {
  try {
    const { guildId, discordGuildId, configurations } = req.body;
    
    if (!guildId || !discordGuildId || !configurations) {
      return res.status(400).json({ error: 'Guild ID, Discord Guild ID, and configurations are required' });
    }
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated() || req.user.role === 'Bot') {
      const member = await db.GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master'
        }
      });
      
      if (!member) {
        return res.status(403).json({ error: 'You must be the Guild Master to update Discord settings' });
      }
    }
    
    // Make sure this Discord guild is connected to this app guild
    const mapping = await db.DiscordGuildMapping.findOne({
      where: { 
        app_guild_id: guildId,
        discord_guild_id: discordGuildId
      }
    });
    
    if (!mapping) {
      return res.status(404).json({ error: 'Discord guild not connected to this app guild' });
    }
    
    // Delete existing configurations
    await db.DiscordChannelConfig.destroy({
      where: { guild_id: guildId }
    });
    
    // Create new configurations
    await Promise.all(configurations.map(config => 
      db.DiscordChannelConfig.create({
        guild_id: guildId,
        discord_guild_id: discordGuildId,
        channel_type: config.channel_type,
        channel_id: config.channel_id,
        enabled: config.enabled !== false
      })
    ));
    
    // Notify Discord bot about the new configuration
    try {
      await callDiscordBot('/webhook/update-config', 'POST', {
        guildId,
        discordGuildId,
        configurations,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
    } catch (botError) {
      console.warn('Failed to notify Discord bot of configuration changes:', botError.message);
      // Continue anyway - the config is saved in our database
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving channel config:', error);
    res.status(500).json({ error: 'Failed to save channel configuration' });
  }
});

// NEW ENDPOINT: Test channels
router.post('/test-channels', async (req, res) => {
  try {
    const { guildId, discordGuildId } = req.body;
    
    if (!guildId || !discordGuildId) {
      return res.status(400).json({ error: 'Guild ID and Discord Guild ID are required' });
    }
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated() || req.user.role === 'Bot') {
      const member = await db.GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master'
        }
      });
      
      if (!member) {
        return res.status(403).json({ error: 'You must be the Guild Master to test Discord integration' });
      }
    }
    
    // Get channel configurations
    const channelConfigs = await db.DiscordChannelConfig.findAll({
      where: { 
        guild_id: guildId,
        enabled: true
      }
    });
    
    if (channelConfigs.length === 0) {
      return res.status(400).json({ error: 'No channel configurations found' });
    }
    
    // Send test messages to each channel
    const results = {};
    
    for (const config of channelConfigs) {
      try {
        // Call Discord bot to send a test message
        await callDiscordBot('/webhook/test-channel', 'POST', {
          guildId,
          discordGuildId,
          channelId: config.channel_id,
          channelType: config.channel_type,
          secret: process.env.BOT_WEBHOOK_SECRET
        });
        
        results[config.channel_type] = { success: true };
      } catch (err) {
        console.error(`Error testing channel ${config.channel_type}:`, err);
        results[config.channel_type] = { 
          success: false, 
          error: err.message || 'Unknown error' 
        };
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error testing channels:', error);
    res.status(500).json({ error: 'Failed to test channels' });
  }
});

// NEW ENDPOINT: Disconnect Discord integration
router.delete('/disconnect/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Verify the user has access to this guild
    if (!req.isAuthenticated() || req.user.role === 'Bot') {
      const member = await db.GuildMember.findOne({
        where: { 
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master' 
        }
      });
      
      if (!member) {
        return res.status(403).json({ error: 'You must be the Guild Master to disconnect Discord integration' });
      }
    }
    
    // Find the Discord mapping
    const mapping = await db.DiscordGuildMapping.findOne({
      where: { app_guild_id: guildId }
    });
    
    if (!mapping) {
      return res.status(404).json({ error: 'Discord guild not connected to this app guild' });
    }
    
    const discordGuildId = mapping.discord_guild_id;
    
    // Delete channel configurations
    await db.DiscordChannelConfig.destroy({
      where: { guild_id: guildId }
    });
    
    // Delete the mapping
    await mapping.destroy();
    
    // Notify Discord bot
    try {
      await callDiscordBot('/webhook/disconnect', 'POST', {
        guildId,
        discordGuildId,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
    } catch (botError) {
      console.warn('Failed to notify Discord bot of disconnection:', botError.message);
      // Continue anyway - the mapping is removed from our database
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Discord:', error);
    res.status(500).json({ error: 'Failed to disconnect Discord integration' });
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
    console.log('Received link-guild request:', {
      discordGuildId: req.body.discordGuildId,
      joinCode: req.body.joinCode,
      hasSecret: !!req.body.secret
    });
    
    // Extract data from request body
    const { discordGuildId, joinCode, secret } = req.body;
    
    // Validate input data
    if (!discordGuildId || !joinCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Discord guild ID and join code are required' 
      });
    }
    
    // Verify webhook secret
    if (secret !== process.env.BOT_WEBHOOK_SECRET) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid webhook secret' 
      });
    }
    
    // Find the guild by join code
    const guild = await db.Guild.findOne({
      where: { join_code: joinCode }
    });
    
    if (!guild) {
      console.log(`Guild not found with join code: ${joinCode}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid join code. Please check your guild settings for the correct code.' 
      });
    }
    
    console.log(`Found guild with join code ${joinCode}: ${guild.id} (${guild.name})`);
    
    // Create or update the mapping entry
    const [mapping, created] = await db.DiscordGuildMapping.findOrCreate({
      where: { discord_guild_id: discordGuildId },
      defaults: { app_guild_id: guild.id }
    });
    
    if (!created) {
      console.log(`Updating existing mapping for Discord guild ${discordGuildId} to app guild ${guild.id}`);
      await mapping.update({ app_guild_id: guild.id });
    } else {
      console.log(`Created new mapping: Discord ${discordGuildId} → App Guild ${guild.id}`);
    }
    
    // Return success response
    res.json({ 
      success: true, 
      message: 'Guild linked successfully', 
      guildName: guild.name 
    });
  } catch (error) {
    console.error('Error linking guild:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to link guild: ' + error.message 
    });
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