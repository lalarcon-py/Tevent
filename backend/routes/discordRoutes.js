// Add to backend/routes/discordRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const { validateUUID } = require('../utils/helpers');

// Discord bot authentication page
router.get('/link', async (req, res) => {
  const { token, serverId, serverName } = req.query;
  
  if (!token || !serverId) {
    return res.status(400).send('Missing parameters');
  }
  
  // Check if user is logged in
  if (!req.isAuthenticated()) {
    // Store parameters in session for after login
    req.session.discordLinkParams = { token, serverId, serverName };
    return res.redirect(`/login?redirectUrl=${encodeURIComponent(`/discord/setup?token=${token}&serverId=${serverId}`)}`);
  }
  
  // Proceed to the link page
  res.render('discord-link', {
    token,
    serverId,
    serverName: serverName || 'Discord Server',
    user: req.user
  });
});

// Fetch user's guilds where they are Guild Master
router.get('/my-guilds', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Find guilds where user is Guild Master
    const guildMemberships = await db.GuildMember.findAll({
      where: {
        user_id: req.user.id,
        role: 'Guild Master'
      },
      include: [{
        model: db.Guild,
        attributes: ['id', 'name', 'status']
      }]
    });
    
    // Format response
    const guilds = guildMemberships
      .filter(m => m.Guild && m.Guild.status === 'ACTIVE')
      .map(m => ({
        id: m.Guild.id,
        name: m.Guild.name
      }));
    
    res.json(guilds);
  } catch (error) {
    console.error('Error fetching user guilds:', error);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Complete Discord link process
router.post('/complete-link', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { token, guildId } = req.body;
  
  if (!token || !guildId || !validateUUID(guildId)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  
  try {
    // Verify user is Guild Master of the selected guild
    const membership = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Guild Master'
      }
    });
    
    if (!membership) {
      return res.status(403).json({ error: 'You must be the Guild Master of this guild' });
    }
    
    // Get guild details
    const guild = await db.Guild.findByPk(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    // Now notify the Discord bot to complete the link
    try {
      const botResponse = await axios.post(`${process.env.DISCORD_BOT_URL}/auth/complete`, {
        token,
        guildId,
        guildName: guild.name
      });
      
      if (botResponse.data.success) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: 'Bot failed to complete link' });
      }
    } catch (botError) {
      console.error('Error communicating with Discord bot:', botError);
      return res.status(500).json({ error: 'Failed to communicate with Discord bot' });
    }
  } catch (error) {
    console.error('Error completing Discord link:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;