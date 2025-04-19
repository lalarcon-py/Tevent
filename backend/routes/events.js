// backend/routes/events.js
const express = require('express');
const router = express.Router();
const { Event, User, EventParticipant, Team, TeamMember } = require('../models');
const db = require('../models');
const { sequelize } = require('../config/database');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

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

// Get all events with debug info
router.get('/all-debug', async (req, res) => {
  try {
    const guildId = req.guildId || req.query.guildId || req.body?.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    console.log(`DEBUG: Fetching all events for guild ${guildId} without filters`);
    
    // Fetch all events for the guild with minimal filtering
    const events = await Event.findAll({
      where: { guild_id: guildId },
      include: [
        {
          model: EventParticipant,
          as: 'participants',
          required: false,
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        },
        {
          model: EventParticipant,
          as: 'tentatives',
          required: false,
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        },
        {
          model: db.EventAbsentee,
          as: 'absentees',
          required: false,
          include: [{
            model: User,
            attributes: ['id', 'username', 'avatar_url']
          }]
        }
      ],
      order: [['event_time', 'DESC']]
    });
    
    // Log detailed event information
    console.log(`Found ${events.length} events total for guild ${guildId}`);
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}: id=${event.id}, title=${event.title}, date=${event.event_time}`);
    });
    
    // Return all events with debug info
    res.json({
      count: events.length,
      guild_id: guildId,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        date: event.event_time,
        event_time: event.event_time,
        description: event.description,
        participants: event.participants || [],
        tentatives: event.tentatives || [],
        absentees: event.absentees || []
      }))
    });
  } catch (error) {
    console.error('Error fetching all events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events', 
      details: error.message,
      stack: error.stack
    });
  }
});

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
    const userId = req.body.userId || req.user.id;
    
    // Debug what we're receiving
    console.log('Signup data received:', {
      role,
      status,
      selectedBuild: selectedBuild ? JSON.stringify(selectedBuild).substring(0, 100) + '...' : null,
      eventId,
      userId
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
    
    // First, check if user has any existing signup (confirmed or tentative) and remove it
    // This prevents a user from being both confirmed and tentative at the same time
    await EventParticipant.destroy({
      where: {
        event_id: eventId,
        user_id: userId,
        guild_id: guildId
      },
      transaction: t
    });
    
    // Remove any existing absentee record when signing up (whether confirmed or tentative)
    await db.EventAbsentee.destroy({
      where: {
        event_id: eventId,
        user_id: userId,
        guild_id: guildId
      },
      transaction: t
    });

    // Create new participant record with the desired status
    const participant = await EventParticipant.create({
      guild_id: guildId,
      event_id: eventId,
      user_id: userId,
      role,
      status, // New status field
      selected_build: processedBuild // Use the processed build
    }, { transaction: t });

    // Log what was created
    console.log('Participant created:', {
      id: participant.id,
      role: participant.role,
      status: participant.status,
      hasSelectedBuild: !!participant.selected_build
    });

    await t.commit();
    
    // Notify Discord bot about the signup
    try {
      // Get user details for the notification
      const user = await db.User.findByPk(userId);
      
      // Use the Railway internal URL for the Discord bot
      const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
      
      console.log(`[INFO] Notifying Discord bot about signup for event ${eventId}`);
      
      await axios.post(`${discordBotUrl}/webhook/update-event-signup`, {
        guildId,
        eventId,
        userId,
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

    // If marking as absent, create an absentee record if it doesn't already exist
    if (isMarkingAbsent) {
      // Check if an absentee record already exists
      const existingAbsentee = await db.EventAbsentee.findOne({
        where: {
          event_id: eventId,
          user_id: userId,
          guild_id: guildId
        },
        transaction: t
      });
      
      // Only create a new absentee record if one doesn't already exist
      if (!existingAbsentee) {
        await db.EventAbsentee.create({
          event_id: eventId,
          user_id: userId,
          guild_id: guildId
        }, { transaction: t });
      }
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
      timezone: req.body.timezone || event.timezone,
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
    
    console.log(`Creating new event for guild ${guildId} by user ${req.user.id}:`, req.body);
    
    const event = await Event.create({
      guild_id: guildId,
      title: req.body.title,
      description: req.body.description,
      event_time: req.body.eventTime || req.body.event_time, // Handle both field naming conventions
      timezone: req.body.timezone || 'America/New_York', // Add timezone field with default
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
    
    console.log(`Successfully created event with ID ${event.id}`);
    
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
      name: error.name,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Failed to create event',
      details: error.message 
    });
  }
});

// Import event from Raid Helper
router.post('/import', 
  isAuthenticated, 
  hasPermission(['Guild Master', 'Guild Advisor', 'Guild Guardian']),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      // Get guild ID from request
      const guildId = req.guildId || req.query.guildId || req.body.guildId;
      
      if (!guildId) {
        await t.rollback();
        return res.status(400).json({ error: 'Guild ID is required' });
      }

      const { event: eventData, participants } = req.body;
      
      console.log('Importing event data:', {
        eventData: { ...eventData, description: eventData.description?.substring(0, 50) + '...' },
        participantsCount: participants?.length,
        originalTimestamp: eventData.originalTimestamp,
        timezone: eventData.timezone
      });

      // Handle original timestamp directly if available
      let eventTime = null;
      
      if (eventData.originalTimestamp) {
        try {
          const timestamp = parseInt(eventData.originalTimestamp) * 1000; // Convert to milliseconds
          if (!isNaN(timestamp)) {
            eventTime = new Date(timestamp);
            console.log('Using original timestamp for event creation:', eventTime);
          } else {
            console.error('Invalid timestamp:', eventData.originalTimestamp);
          }
        } catch (e) {
          console.error('Error parsing originalTimestamp:', e);
        }
      }
      
      // If we couldn't use originalTimestamp, try eventTime
      if (!eventTime && eventData.eventTime) {
        try {
          eventTime = new Date(eventData.eventTime);
          if (!isNaN(eventTime.getTime())) {
            console.log('Using ISO string for event creation:', eventTime);
          } else {
            console.error('Invalid eventTime:', eventData.eventTime);
            eventTime = null;
          }
        } catch (e) {
          console.error('Error parsing eventTime:', e);
        }
      }

      // If still no valid time, try closingTime or other backups
      if (!eventTime) {
        // First, try using closingTimeFormatted if available
        if (eventData.closingTimeFormatted) {
          try {
            eventTime = new Date(eventData.closingTimeFormatted);
            console.log('Using pre-processed closingTime:', eventTime);
            
            // Check if date is valid
            if (isNaN(eventTime.getTime())) {
              console.warn('Invalid closingTimeFormatted format, trying alternatives');
              eventTime = null;
            }
          } catch (e) {
            console.error('Error parsing closingTimeFormatted:', e);
            eventTime = null;
          }
        }
        
        // If still no valid eventTime, try raw closingTime
        if (!eventTime && eventData.closingTime) {
          try {
            // closingTime is typically in seconds, convert to milliseconds
            const timestamp = parseInt(eventData.closingTime) * 1000;
            if (!isNaN(timestamp)) {
              eventTime = new Date(timestamp);
              console.log('Using raw closingTime:', eventTime);
            }
          } catch (e) {
            console.error('Error parsing closing time:', e);
          }
        }
        
        // Last resort: use current time
        if (!eventTime) {
          console.warn('No valid time information found, using current time');
          eventTime = new Date();
        }
      }
      
      // Create the event
      const event = await Event.create({
        guild_id: guildId,
        title: eventData.title,
        description: eventData.description || 'Imported from Raid Helper',
        event_time: eventTime, // Use the parsed time
        location: eventData.location || '',
        tanks: eventData.tanks || 0,
        healers: eventData.healers || 0,
        dps: eventData.dps || 0,
        requirements: eventData.requirements || '',
        timezone: eventData.timezone || 'America/New_York', // Use the selected timezone or default to EST
        created_by: req.user.id
      }, { transaction: t });
      
      console.log('Created event with timezone:', event.timezone, 'and time:', event.event_time);

      // 2. Process participants if available
      const participantResults = { imported: 0, skipped: 0 };
      const participantRecords = [];
      
      if (participants && Array.isArray(participants)) {
        // Process each participant
        for (const participant of participants) {
          try {
            // Look up the user by Discord ID if available
            let userId = null;
            
            if (participant.discordId) {
              const user = await db.User.findOne({
                where: { discord_id: participant.discordId }
              }, { transaction: t });
              
              if (user) {
                userId = user.id;
              }
            }
            
            // Skip if user not found
            if (!userId) {
              participantResults.skipped++;
              console.log(`User with Discord ID ${participant.discordId} not found, skipping`);
              continue;
            }
            
            // Determine if we should create a participant or an absentee
            if (participant.status === 'ABSENT') {
              // Create absentee record
              await db.EventAbsentee.create({
                guild_id: guildId,
                event_id: event.id,
                user_id: userId,
              }, { transaction: t });
              
              console.log(`Marked user ${participant.name} as ABSENT`);
            } else {
              // Create participant record with appropriate status (CONFIRMED or TENTATIVE)
              const participantRecord = await EventParticipant.create({
                guild_id: guildId,
                event_id: event.id,
                user_id: userId,
                role: participant.role,
                status: participant.status || 'CONFIRMED',
                is_late: participant.isLate || false, // Add late flag
                notes: participant.isLate ? 'Marked as arriving late' : '' // Add note for late arrivals
              }, { transaction: t });
              
              console.log(`Added user ${participant.name} as ${participant.status || 'CONFIRMED'}`);
              participantRecords.push(participantRecord);
            }
            
            participantResults.imported++;
          } catch (participantError) {
            console.error('Error importing participant:', participantError);
            participantResults.skipped++;
          }
        }
      }

      // 3. Create teams for the event (one team per tank)
      const teamResults = { created: 0 };
      const tankParticipants = participants.filter(p => p.role === 'TANK');
      
      for (const tank of tankParticipants) {
        // Look up the tank's user ID
        const tankUser = await db.User.findOne({
          where: { discord_id: tank.discordId }
        }, { transaction: t });
        
        if (!tankUser) continue;
        
        // Create a team
        const team = await Team.create({
          guild_id: guildId,
          name: `Team ${teamResults.created + 1}`,
          event_id: event.id,
          is_static: false,
          created_by: req.user.id
        }, { transaction: t });
        
        // Add the tank as first member
        await TeamMember.create({
          guild_id: guildId,
          team_id: team.id,
          user_id: tankUser.id,
          role: 'TANK',
          position: 1
        }, { transaction: t });
        
        teamResults.created++;
      }

      await t.commit();
      
      // Notify Discord bot about the new event
      try {
        // Use the Railway internal URL for the Discord bot
        const discordBotUrl = "http://heartfelt-sparkle.railway.internal:3300";
        
        console.log(`Notifying Discord bot about new imported event ${event.id}`);
        
        // Send the webhook notification
        await axios.post(`${discordBotUrl}/webhook/new-event`, {
          guildId: event.guild_id,
          eventId: event.id,
          secret: process.env.BOT_WEBHOOK_SECRET
        });
        
        console.log(`Successfully notified Discord bot about event ${event.id}`);
      } catch (webhookError) {
        // Just log the error but don't fail the request
        console.error('Failed to notify Discord bot about new imported event:', {
          message: webhookError.message,
          stack: webhookError.stack,
          eventId: event.id
        });
      }

      // Return success with details
      res.status(201).json({
        event,
        participants: participantResults,
        teams: teamResults
      });
    } catch (error) {
      await t.rollback();
      console.error('Event import error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        body: req.body
      });
      res.status(500).json({ 
        error: 'Failed to import event',
        details: error.message 
      });
    }
  }
);

module.exports = router;