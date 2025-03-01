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

// Get all events (fixed include syntax)
router.get('/', async (req, res) => {
  try {
    const events = await Event.findAll({
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

// Event signup (fixed model reference)
router.post('/:id/signup', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { role } = req.body;
    const eventId = req.params.id;

    const [participant] = await EventParticipant.upsert({
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

// Get event teams (fixed model references)
router.get('/:eventId/teams', async (req, res) => {
  try {
    const teams = await Team.findAll({
      where: { event_id: req.params.eventId },
      include: [{
        model: TeamMember,
        as: 'members',
        include: [User],
        order: [['position', 'ASC']]
      }],
      order: [['created_at', 'ASC']]
    });
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.delete('/:id/signup', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId } = req.body;
    const eventId = req.params.id;
    
    // Determine whose signup to remove - the current user or a specified user
    const userIdToRemove = userId || req.user.id;
    
    // Find and delete the participant
    const deleted = await EventParticipant.destroy({
      where: {
        event_id: eventId,
        user_id: userIdToRemove
      },
      transaction: t
    });
    
    if (deleted === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    await t.commit();
    res.status(200).json({ message: 'Successfully removed from event' });
  } catch (error) {
    await t.rollback();
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove from event' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    console.log('Creating event with data:', req.body);

    const event = await Event.create({
      title: req.body.title,
      description: req.body.description,
      event_time: req.body.eventTime,
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