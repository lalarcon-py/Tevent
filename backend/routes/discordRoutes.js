// In routes/discordRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Guild, GuildMember, DiscordGuildMapping } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

// Encryption/decryption functions for state parameter
function encryptState(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc', 
    Buffer.from(process.env.DISCORD_STATE_SECRET, 'hex'),
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptState(text) {
  const [ivHex, encryptedText] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc', 
    Buffer.from(process.env.DISCORD_STATE_SECRET, 'hex'),
    iv
  );
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

router.get('/bot-mapping/:discordGuildId', async (req, res) => {
  try {
    const { discordGuildId } = req.params;
    
    console.log('Bot mapping request for Discord guild ID:', discordGuildId);
    
    // Direct SQL query with string conversion for consistency
    const [result] = await sequelize.query(
      `SELECT discord_guild_id, app_guild_id FROM discord_guild_mappings 
       WHERE discord_guild_id = ?`,
      { 
        replacements: [discordGuildId.toString()],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!result) {
      console.log(`No mapping found for Discord guild ID: ${discordGuildId}`);
      return res.status(404).json({ 
        success: false,
        error: 'No mapping found for this Discord server'
      });
    }
    
    console.log('Found mapping:', result);
    
    res.json({
      success: true,
      discordGuildId: result.discord_guild_id,
      appGuildId: result.app_guild_id
    });
  } catch (error) {
    console.error('Error in bot mapping endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get mapping by Discord guild ID
router.get('/mapping/:discordGuildId', async (req, res) => {
  try {
    const { discordGuildId } = req.params;
    
    const mapping = await DiscordGuildMapping.findOne({
      where: { discord_guild_id: discordGuildId }
    });
    
    if (!mapping) {
      return res.status(404).json({ error: 'No mapping found for this Discord server' });
    }
    
    res.json({
      discordGuildId: mapping.discord_guild_id,
      appGuildId: mapping.app_guild_id
    });
  } catch (error) {
    console.error('Error fetching Discord mapping:', error);
    res.status(500).json({ error: 'Failed to fetch Discord mapping' });
  }
});

// Get guilds that a user can link to Discord
router.get('/linkable-guilds', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get guilds where user is Guild Master
    const guilds = await Guild.findAll({
      include: [{
        model: GuildMember,
        where: { 
          user_id: req.user.id,
          role: 'Guild Master'
        },
        required: true
      }],
      where: { status: 'ACTIVE' }
    });
    
    res.json(guilds);
  } catch (error) {
    console.error('Error fetching linkable guilds:', error);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

router.get('/authorize', async (req, res) => {
    try {
      // Get the guild from the URL parameter
      const guildId = req.query.guild_id;
      
      if (!req.isAuthenticated()) {
        return res.redirect('/login');
      }
      
      // Verify the user has permission to this guild
      const isMember = await GuildMember.findOne({
        where: {
          guild_id: guildId,
          user_id: req.user.id,
          role: 'Guild Master' // Only Guild Masters can set up integrations
        }
      });
      
      if (!isMember) {
        return res.status(403).send('You must be a Guild Master to set up Discord integration');
      }
      
      // Get the guild
      const guild = await Guild.findByPk(guildId);
      if (!guild) {
        return res.status(404).send('Guild not found');
      }
      
      // Create a state parameter with encrypted guild information
      const stateData = {
        guildId: guild.id,
        joinCode: guild.join_code,
        userId: req.user.id,
        timestamp: Date.now()
      };
      
      // Encrypt the state to prevent tampering
      const stateString = JSON.stringify(stateData);
      const encryptedState = encryptState(stateString);
      
      // Redirect to Discord OAuth
      const discordUrl = new URL('https://discord.com/api/oauth2/authorize');
      discordUrl.searchParams.append('client_id', process.env.DISCORD_CLIENT_ID);
      discordUrl.searchParams.append('permissions', '2147485696'); // Standard bot permissions
      discordUrl.searchParams.append('scope', 'bot applications.commands');
      discordUrl.searchParams.append('state', encryptedState);
      discordUrl.searchParams.append('redirect_uri', `${process.env.API_URL}/api/discord/callback`);
      
      res.redirect(discordUrl.toString());
    } catch (error) {
      console.error('Discord authorization error:', error);
      res.status(500).send('Error setting up Discord integration');
    }
  });
  
  // Add a callback handler
  router.get('/callback', async (req, res) => {
    try {
      const { state, guild_id } = req.query;
      
      // Decrypt and validate state
      const decryptedState = decryptState(state);
      const stateData = JSON.parse(decryptedState);
      
      // Verify state is not expired (prevent replay attacks)
      if (Date.now() - stateData.timestamp > 1000 * 60 * 5) { // 5 minutes expiry
        return res.status(400).send('Authorization link expired');
      }
      
      // Now we have both the Discord guild ID and the application guild ID
      // Store the mapping
      await storeDiscordMapping(guild_id, stateData.guildId);
      
      res.redirect(`/guilds/${stateData.guildId}/settings?discord_connected=true`);
    } catch (error) {
      console.error('Discord callback error:', error);
      res.status(500).send('Error completing Discord integration');
    }
  });

// Link a Discord guild to an application guild (for manual setup)
router.post('/link', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { discordGuildId, appGuildId } = req.body;
    
    if (!discordGuildId || !appGuildId) {
      return res.status(400).json({ error: 'Both Discord guild ID and app guild ID are required' });
    }
    
    // ✅ Add validation for appGuildId format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appGuildId)) {
      return res.status(400).json({ error: 'Invalid app guild ID format' });
    }
    
    // Verify user is Guild Master of the app guild
    const isGuildMaster = await GuildMember.findOne({
      where: {
        guild_id: appGuildId,
        user_id: req.user.id,
        role: 'Guild Master'
      }
    });
    
    if (!isGuildMaster) {
      return res.status(403).json({ error: 'You must be a Guild Master to link this guild' });
    }
    
    // ✅ Change the model definition to ensure discord_guild_id is stored as STRING
    await DiscordGuildMapping.upsert({
      discord_guild_id: String(discordGuildId), // Convert to string explicitly
      app_guild_id: appGuildId
    });
    
    // ✅ Skip middleware check for this route
    res.set('X-Skip-Guild-Activity-Check', 'true');
    
    res.status(200).json({ 
      success: true, 
      message: 'Discord server linked successfully!' 
    });
  } catch (error) {
    console.error('Error linking Discord guild:', error);
    res.status(500).json({ error: 'Failed to link Discord guild' });
  }
});

router.post('/link-auto', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { discordGuildId } = req.body;
    
    if (!discordGuildId) {
      return res.status(400).json({ error: 'Discord guild ID is required' });
    }
    
    // Find guilds where the user is a Guild Master
    const userGuilds = await GuildMember.findAll({
      where: { 
        user_id: req.user.id,
        role: 'Guild Master'
      },
      include: [{
        model: Guild,
        attributes: ['id', 'name']
      }]
    });
    
    if (!userGuilds || userGuilds.length === 0) {
      return res.status(403).json({ 
        error: 'You must be a Guild Master of at least one guild to use Discord integration'
      });
    }
    
    // Use the first guild automatically (or the only one if there's just one)
    const appGuildId = userGuilds[0].Guild.id;
    
    // Create or update the mapping
    await DiscordGuildMapping.upsert({
      discord_guild_id: String(discordGuildId), // Store as string
      app_guild_id: appGuildId
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Discord server linked successfully!',
      guildName: userGuilds[0].Guild.name
    });
  } catch (error) {
    console.error('Error auto-linking Discord guild:', error);
    res.status(500).json({ error: 'Failed to link Discord guild' });
  }
});

// backend/routes/discordSetupRoutes.js
router.post('/complete-link', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { discordServerId } = req.body; // Clearly named
    
    if (!discordServerId) {
      return res.status(400).json({ error: 'Discord server ID is required' });
    }
    
    // Find the user's guild where they're a Guild Master
    const userGuild = await GuildMember.findOne({
      where: { 
        user_id: req.user.id,
        role: 'Guild Master'
      },
      include: [{
        model: Guild,
        attributes: ['id', 'name', 'status']
      }]
    });
    
    if (!userGuild) {
      return res.status(403).json({ 
        error: 'You must be a Guild Master of a guild to use Discord integration'
      });
    }
    
    // Get the actual application guild UUID
    const appGuildId = userGuild.Guild.id; // This is your UUID like f88e6aab-...
    
    console.log('Creating mapping between:', {
      discordServerId, // Discord numeric ID
      appGuildId      // Your UUID
    });
    
    // Create the mapping with explicit parameter names
    await DiscordGuildMapping.upsert({
      discord_guild_id: discordServerId.toString(),
      app_guild_id: appGuildId
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Discord server linked successfully!',
      guildName: userGuild.Guild.name
    });
  } catch (error) {
    console.error('Error linking Discord guild:', error);
    res.status(500).json({ error: 'Failed to link Discord guild' });
  }
});

  
// Helper function to store the mapping
async function storeDiscordMapping(discordGuildId, appGuildId) {
  try {
    // Store mapping directly in database
    await DiscordGuildMapping.upsert({
      discord_guild_id: discordGuildId,
      app_guild_id: appGuildId
    });
    
    // If you still want to notify the bot (for cache purposes), you can keep this
    try {
      await axios.post(`${process.env.BOT_WEBHOOK_URL}/update-mapping`, {
        discordGuildId,
        appGuildId,
        secret: process.env.BOT_WEBHOOK_SECRET // For security
      });
    } catch (webhookError) {
      console.warn('Failed to notify bot of mapping update:', webhookError);
      // Continue anyway since we've stored the mapping in the database
    }
  } catch (error) {
    console.error('Error storing Discord mapping:', error);
    throw error;
  }
}

module.exports = router;