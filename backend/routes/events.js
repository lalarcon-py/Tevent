// routes/events.js
const express = require('express');
const router = express.Router();
const { Event, User, EventParticipant } = require('../models');
const sequelize = require('../config/database');

// Debug log to verify models are loaded
console.log('Available models:', Object.keys(require('../models')));

// Get all events
router.get('/', async (req, res) => {
 try {
   console.log('Attempting to fetch events...');
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

   console.log('Creating event with data:', {
     ...req.body,
     created_by: req.user.id
   });

   const event = await Event.create({
     ...req.body,
     created_by: req.user.id
   }, { transaction: t });

   console.log('Event created successfully:', event.toJSON());

   await t.commit();
   res.status(201).json(event);
 } catch (error) {
   await t.rollback();
   console.error('Error creating event:', error);
   res.status(500).json({ error: error.message });
 }
});

// Update event
router.put('/:id', async (req, res) => {
 const t = await sequelize.transaction();
 try {
   console.log('Processing update for event:', req.params.id);
   
   if (!req.isAuthenticated()) {
     return res.status(401).json({ error: 'Not authenticated' });
   }

   const event = await Event.findByPk(req.params.id);
   if (!event) {
     await t.rollback();
     return res.status(404).json({ error: 'Event not found' });
   }

   // Clean up the update data
   const updateData = {
     title: req.body.title,
     description: req.body.description,
     event_time: req.body.eventTime || req.body.event_time,
     location: req.body.location,
     tanks: req.body.tanks,
     healers: req.body.healers,
     dps: req.body.dps,
     requirements: req.body.requirements
   };

   console.log('Updating event with data:', updateData);

   await event.update(updateData, { transaction: t });
   await t.commit();

   // Fetch the updated event to return
   const updatedEvent = await Event.findByPk(req.params.id, {
     include: [{
       model: EventParticipant,
       as: 'participants',
       include: [{
         model: User,
         attributes: ['id', 'username', 'avatar_url']
       }]
     }]
   });

   console.log('Event updated successfully:', updatedEvent.toJSON());
   res.json(updatedEvent);
 } catch (error) {
   await t.rollback();
   console.error('Error updating event:', error);
   res.status(500).json({ error: error.message });
 }
});

// Event signup
router.post('/:id/signup', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
 
    const { role } = req.body;
    const eventId = req.params.id;
 
    // Check for existing signup
    const existingSignup = await EventParticipant.findOne({
      where: {
        event_id: eventId,
        user_id: req.user.id
      }
    });
 
    // If already signed up, update the role instead of creating new
    if (existingSignup) {
      await existingSignup.update({ role }, { transaction: t });
      await t.commit();
      return res.json(existingSignup);
    }
 
    // Create new signup (removed participant limit check)
    const participant = await EventParticipant.create({
      event_id: eventId,
      user_id: req.user.id,
      role
    }, { transaction: t });
 
    await t.commit();
    res.status(201).json(participant);
  } catch (error) {
    await t.rollback();
    console.error('Error signing up for event:', error);
    res.status(500).json({ error: error.message });
  }
 });

// Remove participant
router.delete('/:eventId/participants/:userId', async (req, res) => {
 const t = await sequelize.transaction();
 try {
   if (!req.isAuthenticated()) {
     return res.status(401).json({ error: 'Not authenticated' });
   }
   
   const participant = await EventParticipant.findOne({
     where: {
       event_id: req.params.eventId,
       user_id: req.params.userId
     }
   });

   if (!participant) {
     await t.rollback();
     return res.status(404).json({ error: 'Participant not found' });
   }

   await participant.destroy({ transaction: t });
   await t.commit();
   res.json({ message: 'Participant removed successfully' });
 } catch (error) {
   await t.rollback();
   console.error('Error removing participant:', error);
   res.status(500).json({ error: error.message });
 }
});

// Get event participants
router.get('/:id/participants', async (req, res) => {
  try {
    const participants = await EventParticipant.findAll({
      where: {
        event_id: req.params.id
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'avatar_url', 'builds', 'weapon_spec', 'combat_power']
      }],
      order: [['created_at', 'ASC']]
    });

    res.json(participants);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/event/:eventId', async (req, res) => {
  try {
      console.log('Attempting to fetch teams for event:', req.params.eventId);
      
      // Check if event exists first
      const event = await Event.findByPk(req.params.eventId);
      if (!event) {
          console.log('Event not found:', req.params.eventId);
          return res.status(404).json({ error: 'Event not found' });
      }
      
      console.log('Found event, fetching teams...');
      const teams = await Team.findAll({
          where: { event_id: req.params.eventId },
          include: [{
              model: TeamMember,
              as: 'members',
              include: [{
                  model: User,
                  attributes: ['id', 'username', 'avatar_url']
              }],
              order: [['position', 'ASC']]
          }],
          order: [['created_at', 'ASC']]
      });
      
      console.log(`Found ${teams.length} teams for event`);
      res.json(teams);
  } catch (error) {
      console.error('Detailed error fetching teams:', error);
      res.status(500).json({ 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
});

module.exports = router;