const express = require('express');
const router = express.Router();
const { Event, User, EventParticipant, Team, TeamMember } = require('../models');
const db = require('../models');
const { sequelize } = require('../config/database');
const axios = require('axios');

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
    // Try to get guildId from multiple places
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body?.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
      } else {
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    } else if (!guildId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    
    const events = await Event.findAll({
      where: { guild_id: guildId },
      include: [
        {
          model: EventParticipant,
          as: 'participants',
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        },
        {
          model: db.EventAbsentee,
          as: 'absentees',
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        }
      ],
      order: [['event_time', 'ASC']]
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/:eventId/absentees', async (req, res) => {
  try {
    const { eventId } = req.params;
    const guildId = req.guildId || req.query.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Query for users who have explicitly marked themselves as absent
    const absentees = await db.EventAbsentee.findAll({
      where: { 
        event_id: eventId,
        guild_id: guildId 
      },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url']
      }]
    });
    
    res.json(absentees);
  } catch (error) {
    console.error('Error fetching absentees:', error);
    res.status(500).json({ error: 'Failed to fetch absentees' });
  }
});

// Event signup
router.post('/:id/signup', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { role } = req.body;
    const eventId = req.params.id;
    
    // Try to get guildId from multiple places
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
      }
    }
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required and no default guild found for user' });
    }

    // Validate role format
    const validRoles = ['TANK', 'HEALER', 'DPS'];
    if (!validRoles.includes(role)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid role. Must be TANK, HEALER, or DPS' });
    }

    const [participant] = await EventParticipant.upsert({
      guild_id: guildId,
      event_id: eventId,
      user_id: req.body.userId || req.user.id, // Support admin operations
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

router.delete('/:id/signup', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const eventId = req.params.id;
    const userId = req.body.userId || req.user.id;
    
    // Try to get guildId from multiple places
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
      }
    }
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required and no default guild found for user' });
    }

    // Check if removal is part of marking as absent
    const isMarkingAbsent = req.body.markAsAbsent === true;

    // Remove the participant
    const deletionCount = await EventParticipant.destroy({
      where: {
        event_id: eventId,
        user_id: userId,
        guild_id: guildId
      },
      transaction: t
    });

    if (deletionCount === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Participant not found' });
    }

    // If marking as absent, create an absentee record
    if (isMarkingAbsent) {
      await db.EventAbsentee.create({
        event_id: eventId,
        user_id: userId,
        guild_id: guildId
      }, { transaction: t });
    }

    await t.commit();
    res.status(200).json({ message: 'Participant removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

router.put('/:id', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const eventId = req.params.id;
    
    // Try to get guildId from multiple places
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
      }
    }
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required and no default guild found for user' });
    }

    const event = await Event.findOne({
      where: {
        id: eventId,
        guild_id: guildId
      }
    });

    if (!event) {
      await t.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update the event
    await event.update({
      title: req.body.title || event.title,
      description: req.body.description || event.description,
      event_time: req.body.event_time || req.body.eventTime || event.event_time,
      location: req.body.location || event.location,
      tanks: req.body.tanks !== undefined ? req.body.tanks : event.tanks,
      healers: req.body.healers !== undefined ? req.body.healers : event.healers,
      dps: req.body.dps !== undefined ? req.body.dps : event.dps,
      requirements: req.body.requirements || event.requirements
    }, { transaction: t });

    await t.commit();

    // Fetch the updated event with associations
    const updatedEvent = await Event.findByPk(event.id, {
      include: [{
        model: EventParticipant,
        as: 'participants',
        include: [{
          model: User,
          attributes: ['id', 'username', 'avatar_url']
        }]
      }]
    });

    res.json(updatedEvent);
  } catch (error) {
    await t.rollback();
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const eventId = req.params.id;
    
    // Try to get guildId from multiple places
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
      }
    }
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required and no default guild found for user' });
    }

    // Delete participants first
    await EventParticipant.destroy({
      where: {
        event_id: eventId,
        guild_id: guildId
      },
      transaction: t
    });

    // Delete teams associated with this event
    const teams = await Team.findAll({
      where: {
        event_id: eventId,
        guild_id: guildId
      },
      transaction: t
    });

    // Delete team members
    for (const team of teams) {
      await TeamMember.destroy({
        where: {
          team_id: team.id,
          guild_id: guildId
        },
        transaction: t
      });
    }

    await Team.destroy({
      where: {
        event_id: eventId,
        guild_id: guildId
      },
      transaction: t
    });

    // Delete the event
    const deletedCount = await Event.destroy({
      where: {
        id: eventId,
        guild_id: guildId
      },
      transaction: t
    });

    if (deletedCount === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    await t.commit();

    try {
      // Use the Railway internal URL for the Discord bot
      const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
      
      console.log(`[INFO] Notifying Discord bot about deleted event ${eventId}`);
      
      await axios.post(`${discordBotUrl}/webhook/delete-event`, {
        guildId: guildId,
        eventId: eventId,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`[INFO] Successfully notified Discord bot about deleted event ${eventId}`);
    } catch (webhookError) {
      console.error(`[ERROR] Failed to notify Discord bot about deleted event:`, webhookError);
      // Don't throw error - event was successfully deleted
    }

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Create an event
router.post('/', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // Try to get guildId from multiple places
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // If no guildId explicitly provided, try to get user's primary guild
    if (!guildId && req.isAuthenticated()) {
      const guildMember = await db.GuildMember.findOne({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']]
      });
      
      if (guildMember) {
        guildId = guildMember.guild_id;
      }
    }
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required and no default guild found for user' });
    }
    
    const event = await Event.create({
      guild_id: guildId,
      title: req.body.title,
      description: req.body.description,
      event_time: req.body.eventTime || req.body.event_time, // Handle both field naming conventions
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

    // Notify Discord bot about the new event
    try {
      // Use the Railway internal URL for the Discord bot
      const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
      
      console.log(`Notifying Discord bot about new event ${event.id}`);
      
      // Send the webhook notification
      await axios.post(`${discordBotUrl}/webhook/new-event`, {
        guildId: event.guild_id,
        eventId: event.id,
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`Successfully notified Discord bot about event ${event.id}`);
    } catch (webhookError) {
      // Just log the error but don't fail the request
      console.error('Failed to notify Discord bot about new event:', {
        message: webhookError.message,
        stack: webhookError.stack,
        eventId: event.id
      });
    }

    res.status(201).json(createdEvent);
  } catch (error) {
    await t.rollback();
    console.error('Event creation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Failed to create event',
      details: error.message 
    });
  }
});

module.exports = router;