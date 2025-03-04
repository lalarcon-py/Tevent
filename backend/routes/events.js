const express = require('express');
const router = express.Router();
const { Event, User, EventParticipant, Team, TeamMember } = require('../models');
const { sequelize } = require('../config/database');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all events
router.get('/', async (req, res) => {
  try {
    const guildId = req.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    const events = await Event.findAll({
      where: { guild_id: guildId },
      include: [{
        model: EventParticipant,
        as: 'participants',
        include: [{
          model: User,
          attributes: ['id', 'username', 'avatar_url']
        }]
      }],
      order: [['event_time', 'ASC']]
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Event signup
router.post('/:id/signup', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { role } = req.body;
    const eventId = req.params.id;
    const guildId = req.guildId;
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const [participant] = await EventParticipant.upsert({
      guild_id: guildId,
      event_id: eventId,
      user_id: req.user.id,
      role
    }, { transaction: t });

    await t.commit();
    res.status(200).json(participant);
  } catch (error) {
    await t.rollback();
    console.error('Event signup error:', error);
    res.status(500).json({ error: 'Failed to process signup' });
  }
});

// Create event
router.post('/', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    console.log('Creating event with data:', req.body);

    const guildId = req.guildId;
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    const event = await Event.create({
      guild_id: guildId,
      title: req.body.title,
      description: req.body.description,
      event_time: req.body.eventTime || req.body.event_time,
      location: req.body.location,
      tanks: req.body.tanks,
      healers: req.body.healers,
      dps: req.body.dps,
      requirements: req.body.requirements,
      created_by: req.user.id
    }, {
      transaction: t
    });

    await t.commit();
    
    // Fetch the created event with associations
    const createdEvent = await Event.findByPk(event.id, {
      include: [{
        model: EventParticipant,
        as: 'participants',
        include: [{
          model: User,
          attributes: ['id', 'username', 'avatar_url']
        }]
      }]
    });

    res.status(201).json(createdEvent);
  } catch (error) {
    await t.rollback();
    console.error('Event creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create event',
      details: error.message 
    });
  }
});

module.exports = router;