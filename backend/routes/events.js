const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');


console.log('Available models:', Object.keys(db));

// Get all events
router.get('/', async (req, res) => {
  try {
    console.log('Attempting to fetch events...');
    const events = await db.Event.findAll({
      include: [{
        model: db.EventParticipant,
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'avatar_url']
        }]
      }],
      order: [['event_time', 'ASC']]
    });
    console.log(`Found ${events.length} events`);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new event
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const event = await db.Event.create({
      ...req.body,
      created_by: req.user.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json(event);
  } catch (error) {
    await t.rollback();
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const event = await db.Event.findByPk(req.params.id);
    if (!event) {
      await t.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.update(req.body, { transaction: t });
    await t.commit();
    res.json(event);
  } catch (error) {
    await t.rollback();
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const event = await db.Event.findByPk(req.params.id);
    if (!event) {
      await t.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Sign up for event
router.post('/:id/signup', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { role } = req.body;
    const eventId = req.params.id;

    const existingSignup = await db.EventParticipant.findOne({
      where: {
        event_id: eventId,
        user_id: req.user.id
      }
    });

    if (existingSignup) {
      await t.rollback();
      return res.status(400).json({ error: 'Already signed up for this event' });
    }

    const event = await db.Event.findByPk(eventId, {
      include: [{
        model: db.EventParticipant,
        where: { role },
        required: false
      }]
    });

    if (!event) {
      await t.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    const currentCount = event.event_participants?.length || 0;
    const maxForRole = event[role.toLowerCase() + 's'];

    if (currentCount >= maxForRole) {
      await t.rollback();
      return res.status(400).json({ error: `No ${role} slots available` });
    }

    const participant = await db.EventParticipant.create({
      event_id: eventId,
      user_id: req.user.id,
      role
    }, { transaction: t });

    await t.commit();
    res.status(201).json(participant);
  } catch (error) {
    await t.rollback();
    console.error('Error signing up for event:', error);
    res.status(500).json({ error: 'Failed to sign up for event' });
  }
});

module.exports = router;