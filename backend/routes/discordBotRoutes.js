// backend/routes/discordBotRoutes.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// Direct bot mapping endpoint - NO authentication required
router.get('/bot-mapping/:discordGuildId', async (req, res) => {
  try {
    const { discordGuildId } = req.params;
    console.log('Bot mapping request for Discord guild ID:', discordGuildId);
    
    // Direct database query without authentication
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

// Bot authentication endpoint
router.post('/login', async (req, res) => {
  try {
    const { botSecret } = req.body;
    
    // Verify bot secret
    if (botSecret !== process.env.BOT_SECRET) {
      return res.status(401).json({ error: 'Invalid bot credentials' });
    }
    
    // Create a bot user session
    req.login({
      id: 'bot-user',
      username: 'Discord Bot',
      role: 'Bot'
    }, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      res.status(200).json({ success: true });
    });
  } catch (error) {
    console.error('Bot login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;