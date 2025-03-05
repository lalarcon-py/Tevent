const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;

// Create team preset
router.post('/', async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, eventId, teamsData } = req.body;
    
    // Get guild ID from request
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
        console.log(`Found user guild: ${guildId} for team preset creation`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    }
    
    if (!name || !eventId || !teamsData) {
      await t.rollback();
      return res.status(400).json({ error: 'Name, eventId, and teamsData are required' });
    }

    const preset = await db.TeamPreset.create({
      name,
      event_id: eventId,
      guild_id: guildId,
      teams_data: teamsData,
      created_by: req.user.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json(preset);
  } catch (error) {
    await t.rollback();
    console.error('Error creating preset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get presets for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get guild ID from request
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body?.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
        console.log(`Found user guild: ${guildId} for team presets request`);
      } else {
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    } else if (!guildId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const presets = await db.TeamPreset.findAll({
      where: { 
        event_id: eventId,
        guild_id: guildId
      }
    });
    res.json(presets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific preset
router.get('/:presetId', async (req, res) => {
  try {
    const { presetId } = req.params;
    
    // Get guild ID from request
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body?.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
        console.log(`Found user guild: ${guildId} for team preset request`);
      } else {
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    } else if (!guildId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const preset = await db.TeamPreset.findOne({
      where: { 
        id: presetId,
        guild_id: guildId
      }
    });
    
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const presetId = req.params.id;
    
    // Get guild ID from request
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body?.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
        console.log(`Found user guild: ${guildId} for team preset deletion`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    } else if (!guildId) {
      await t.rollback();
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const result = await db.TeamPreset.destroy({
      where: { 
        id: presetId,
        guild_id: guildId
      },
      transaction: t
    });

    if (result === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Preset not found' });
    }

    await t.commit();
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;