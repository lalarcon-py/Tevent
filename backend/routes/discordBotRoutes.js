// Add to backend/routes/discordBotRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');

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

module.exports = router;