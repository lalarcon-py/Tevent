const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const schemaManager = require('../utils/schemaManager');
const db = require('../models');

router.post('/create', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const guildId = uuidv4();
    
    // Create new schema for the guild
    await schemaManager.createGuildSchema(guildId);
    
    // Create guild record
    const guild = await db.Guild.create({
      id: guildId,
      name: req.body.name,
      owner_id: req.user.discord_id
    });

    // Add user to guild members
    await db.GuildMember.create({
      guild_id: guildId,
      user_id: req.user.id,
      role: 'Guild Master'
    });

    res.json({ 
      guild,
      inviteLink: `${process.env.CLIENT_BASE_URL}/join/${guildId}`
    });
  } catch (error) {
    console.error('Guild creation error:', error);
    res.status(500).json({ error: 'Failed to create guild' });
  }
});

router.get('/join/:guildId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { guildId } = req.params;
    
    // Check if guild exists
    const guild = await db.Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is already a member
    const existingMember = await db.GuildMember.findOne({
      where: {
        guild_id: guildId,
        user_id: req.user.id
      }
    });

    if (!existingMember) {
      await db.GuildMember.create({
        guild_id: guildId,
        user_id: req.user.id,
        role: 'Member'
      });
    }

    res.json({ guild });
  } catch (error) {
    console.error('Guild join error:', error);
    res.status(500).json({ error: 'Failed to join guild' });
  }
});

module.exports = router;