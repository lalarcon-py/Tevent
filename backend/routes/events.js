// backend/routes/events.js
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

// Permission middleware
const hasPermission = (roles) => (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Permission denied' });
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
          where: { status: 'CONFIRMED' }, // Only include confirmed participants
          required: false,
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        },
        {
          model: EventParticipant,
          as: 'tentatives',
          where: { status: 'TENTATIVE' }, // Include tentative participants
          required: false,
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

// In backend/routes/events.js, add this new endpoint
router.get('/:eventId/tentatives', async (req, res) => {
  try {
    const { eventId } = req.params;
    const guildId = req.guildId || req.query.guildId || req.body?.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    console.log('Fetching tentatives for event:', eventId, 'guild:', guildId);
    
    // Query for users who are marked as tentative for this event
    const tentatives = await db.EventParticipant.findAll({
      where: { 
        event_id: eventId,
        guild_id: guildId,
        status: 'TENTATIVE'
      },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url']
      }]
    });
    
    res.json(tentatives);
  } catch (error) {
    console.error('Error fetching tentatives:', error);
    res.status(500).json({ error: 'Failed to fetch tentatives' });
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

// POST endpoint for updating team members
router.post('/:teamId/members', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { memberId, role, sourceTeamId, selectedBuild } = req.body;
    const targetTeamId = req.params.teamId;
    
    // Get guild ID from request
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
    // Check if team exists
    const targetTeam = await db.Team.findOne({
      where: { 
        id: targetTeamId,
        guild_id: guildId
      }, 
      transaction: t 
    });
    
    if (!targetTeam) {
      await t.rollback();
      return res.status(404).json({ error: 'Target team not found' });
    }

    // If member is coming from another team, remove them from that team first
    if (sourceTeamId) {
      await db.TeamMember.destroy({
        where: { 
          team_id: sourceTeamId,
          user_id: memberId,
          guild_id: guildId
        },
        transaction: t
      });
    }

    // Get current position count
    const currentMembers = await db.TeamMember.count({
      where: { 
        team_id: targetTeamId,
        guild_id: guildId
      },
      transaction: t
    });

    // Create team member data, including the selected build
    const teamMemberData = {
      team_id: targetTeamId,
      user_id: memberId,
      guild_id: guildId,
      role: role,
      position: currentMembers + 1
    };
    
    // Add selected build if provided
    if (selectedBuild) {
      teamMemberData.selected_build = typeof selectedBuild === 'string' ? 
        selectedBuild : JSON.stringify(selectedBuild);
    }

    // Create team member
    const teamMember = await db.TeamMember.create(teamMemberData, { transaction: t });

    // Get updated member data with user info
    const updatedMember = await db.TeamMember.findOne({
      where: { id: teamMember.id },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'builds']
      }],
      transaction: t
    });

    await t.commit();
    res.json(updatedMember);
  } catch (error) {
    await t.rollback();
    console.error('Error updating team member:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/signup', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { role, selectedBuild, status = 'CONFIRMED' } = req.body; // Default status is CONFIRMED
    const eventId = req.params.id;
    
    // Debug what we're receiving
    console.log('Signup data received:', {
      role,
      status,
      selectedBuild: selectedBuild ? JSON.stringify(selectedBuild).substring(0, 100) + '...' : null,
      eventId
    });
    
    // Get guildId (existing code)
    let guildId = req.guildId || req.params.guildId || req.query.guildId || req.body.guildId;
    
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
    
    // Validate status format
    const validStatuses = ['CONFIRMED', 'TENTATIVE', 'ABSENT'];
    if (!validStatuses.includes(status)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid status. Must be CONFIRMED, TENTATIVE, or ABSENT' });
    }

    // IMPORTANT: Ensure selectedBuild is properly formatted for JSONB
    let processedBuild = selectedBuild;
    if (selectedBuild && typeof selectedBuild === 'string') {
      try {
        processedBuild = JSON.parse(selectedBuild);
      } catch (e) {
        console.error('Error parsing selectedBuild string:', e);
      }
    }

    // Create or update the participant
    const [participant] = await EventParticipant.upsert({
      guild_id: guildId,
      event_id: eventId,
      user_id: req.body.userId || req.user.id,
      role,
      status, // New status field
      selected_build: processedBuild // Use the processed build
    }, { transaction: t });

    // Log what was actually saved
    console.log('Participant saved:', {
      id: participant.id,
      role: participant.role,
      status: participant.status,
      hasSelectedBuild: !!participant.selected_build
    });

    await t.commit();
    
    // Notify Discord bot about the signup
    try {
      // Get user details for the notification
      const user = await db.User.findByPk(req.body.userId || req.user.id);
      
      // Use the Railway internal URL for the Discord bot
      const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
      
      console.log(`[INFO] Notifying Discord bot about signup for event ${eventId}`);
      
      await axios.post(`${discordBotUrl}/webhook/update-event-signup`, {
        guildId,
        eventId,
        userId: req.body.userId || req.user.id,
        username: user.username,
        action: 'signup',
        role,
        status, // Include status in the notification
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`[INFO] Successfully notified Discord bot about signup update`);
    } catch (webhookError) {
      console.error('Failed to notify Discord bot about signup update:', {
        message: webhookError.message,
        stack: webhookError.stack,
        eventId
      });
      // Don't fail the request if Discord notification fails
    }
    
    res.status(200).json(participant);
  } catch (error) {
    await t.rollback();
    console.error('Event signup error:', error);
    res.status(500).json({ error: 'Failed to process signup' });
  }
});

// Add to backend/routes/events.js
router.get('/:eventId/team-planner-data', async (req, res) => {
  try {
    const { eventId } = req.params;
    const guildId = req.guildId || req.query.guildId || req.body?.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    console.log(`Fetching team planner data for event ${eventId}, guild ${guildId}`);
    
    // Get teams
    const teams = await db.Team.findAll({
      where: { 
        event_id: eventId,
        guild_id: guildId
      },
      include: [{
        model: db.TeamMember,
        as: 'members',
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'avatar_url', 'builds', 'combat_power']
        }]
      }]
    });
    
    // Get event confirmed participants with selected_build
    const participants = await db.EventParticipant.findAll({
      where: { 
        event_id: eventId,
        guild_id: guildId,
        status: 'CONFIRMED'
      },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'builds', 'combat_power']
      }]
    });
    
    // Get event tentative participants with selected_build
    const tentatives = await db.EventParticipant.findAll({
      where: { 
        event_id: eventId,
        guild_id: guildId,
        status: 'TENTATIVE'
      },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'builds', 'combat_power']
      }]
    });
    
    // Filter out participants who are already in teams
    const teamMemberIds = new Set(teams.flatMap(team => 
      team.members?.map(member => member.user_id) || []
    ));
    
    const availableParticipants = participants.filter(participant => 
      !teamMemberIds.has(participant.user_id)
    );
    
    const availableTentatives = tentatives.filter(tentative => 
      !teamMemberIds.has(tentative.user_id)
    );
    
    // Log counts for debugging
    console.log(`Found ${teams.length} teams, ${availableParticipants.length} available participants, and ${availableTentatives.length} tentative participants`);
    
    res.json({
      teams,
      participants: availableParticipants,
      tentatives: availableTentatives
    });
  } catch (error) {
    console.error('Error fetching team planner data:', error);
    res.status(500).json({ error: 'Failed to fetch team planner data' });
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
    
    // Notify Discord bot about the signup change
    try {
      // Get user details for the notification
      const user = await db.User.findByPk(userId);
      
      // Use the Railway internal URL for the Discord bot
      const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
      
      console.log(`[INFO] Notifying Discord bot about signup change for event ${eventId}`);
      
      await axios.post(`${discordBotUrl}/webhook/update-event-signup`, {
        guildId,
        eventId,
        userId,
        username: user.username,
        action: isMarkingAbsent ? 'absent' : 'remove',
        secret: process.env.BOT_WEBHOOK_SECRET
      });
      
      console.log(`[INFO] Successfully notified Discord bot about signup update`);
    } catch (webhookError) {
      console.error('Failed to notify Discord bot about signup change:', {
        message: webhookError.message,
        stack: webhookError.stack,
        eventId
      });
      // Don't fail the request if Discord notification fails
    }

    res.status(200).json({ message: 'Participant removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// Apply permissions to event modification routes
router.put('/:id', 
  isAuthenticated, 
  hasPermission(['Guild Master', 'Guild Advisor', 'Guild Guardian']), 
  async (req, res) => {
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

router.delete('/:id', 
  isAuthenticated, 
  hasPermission(['Guild Master', 'Guild Advisor', 'Guild Guardian']), 
  async (req, res) => {
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

// Create an event with permission check
router.post('/', 
  isAuthenticated, 
  hasPermission(['Guild Master', 'Guild Advisor', 'Guild Guardian']), 
  async (req, res) => {
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