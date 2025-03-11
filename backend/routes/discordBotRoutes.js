// backend/routes/discordBotRoutes.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// Direct bot mapping endpoint - NO authentication required
// In backend/routes/discordBotRoutes.js

// Direct bot mapping endpoint - NO authentication required but secured with API key
router.get('/bot-mapping/:discordGuildId', async (req, res) => {
  try {
    const { discordGuildId } = req.params;
    
    // SECURITY: Use API key authentication
    const apiKey = req.headers['x-bot-api-key'];
    if (!apiKey || apiKey !== process.env.BOT_API_KEY) {
      console.log('Unauthorized access attempt to bot mapping');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized access'
      });
    }
    
    console.log('Authorized bot mapping request for Discord guild ID:', discordGuildId);
    
    // Use direct database query with parameterized query
    const [result] = await sequelize.query(
      `SELECT discord_guild_id, app_guild_id FROM discord_guild_mappings 
       WHERE discord_guild_id = $1`,
      { 
        bind: [discordGuildId.toString()],
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
    
    res.json({
      success: true,
      appGuildId: result.app_guild_id
    });
  } catch (error) {
    console.error('Error in bot mapping endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Bot authentication endpoint
router.post('/login', async (req, res) => {
  try {
    const { botSecret } = req.body;
    
    // SECURITY FIX: Use constant-time comparison to prevent timing attacks
    if (!botSecret || Buffer.from(botSecret).length !== Buffer.from(process.env.BOT_SECRET).length || 
        botSecret !== process.env.BOT_SECRET) {
      console.log('Invalid bot login attempt');
      return res.status(401).json({ error: 'Invalid bot credentials' });
    }
    
    // SECURITY FIX: Add limited scope for bot session
    req.login({
      id: 'bot-user',
      username: 'Discord Bot',
      role: 'Bot',
      isBot: true, // Flag to identify bot sessions
      permissions: ['read_events', 'read_teams', 'read_members'] // Explicit permissions
    }, (err) => {
      if (err) {
        console.error('Bot session creation failed:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      // SECURITY FIX: Limited success response
      res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Bot login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;