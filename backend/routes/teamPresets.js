const express = require('express');
const router = express.Router();
const db = require('../models');

// Create team preset
router.post('/', async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, eventId, teamsData } = req.body;
    
    if (!name || !eventId || !teamsData) {
      await t.rollback();
      return res.status(400).json({ error: 'Name, eventId, and teamsData are required' });
    }

    const preset = await db.TeamPreset.create({
      name,
      event_id: eventId,
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
    const presets = await db.TeamPreset.findAll({
      where: { event_id: req.params.eventId }
    });
    res.json(presets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific preset
router.get('/:presetId', async (req, res) => {
  try {
    const preset = await db.TeamPreset.findByPk(req.params.presetId);
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;