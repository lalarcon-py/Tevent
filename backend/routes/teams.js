const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;

// Get all teams
router.get('/', async (req, res) => {
  try {
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
        console.log(`Found user guild: ${guildId} for teams request`);
      } else {
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    } else if (!guildId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const teams = await db.Team.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.TeamMember,
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'avatar_url', 'builds']
        }]
      }]
    });
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get teams for a specific event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('Fetching teams for event:', eventId);
    
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
        console.log(`Found user guild: ${guildId} for event teams request`);
      } else {
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    } else if (!guildId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
          attributes: ['id', 'username', 'avatar_url', 'builds']
        }]
      }],
      order: [['created_at', 'ASC']]
    });

    console.log(`Found ${teams.length} teams`);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new team
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, eventId } = req.body;
    
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
        console.log(`Found user guild: ${guildId} for team creation`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    }
    
    if (!name || !eventId) {
      await t.rollback();
      return res.status(400).json({ error: 'Name and eventId are required' });
    }

    const team = await db.Team.create({
      name,
      event_id: eventId,
      guild_id: guildId,
      created_by: req.user.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json(team);
  } catch (error) {
    await t.rollback();
    console.error('Error creating team:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update team members
router.post('/:teamId/members', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { memberId, role, sourceTeamId } = req.body;
    const targetTeamId = req.params.teamId;
    
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
        console.log(`Found user guild: ${guildId} for team member update`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    }

    console.log('Adding member to team:', { memberId, role, targetTeamId, guildId });

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

    // Create team member
    const teamMember = await db.TeamMember.create({
      team_id: targetTeamId,
      user_id: memberId,
      guild_id: guildId,
      role: role,
      position: currentMembers + 1
    }, { transaction: t });

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

// Delete team member
router.delete('/:teamId/members/:memberId', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { teamId, memberId } = req.params;
    
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
        console.log(`Found user guild: ${guildId} for team member deletion`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    }
    
    await db.TeamMember.destroy({
      where: {
        team_id: teamId,
        user_id: memberId,
        guild_id: guildId
      },
      transaction: t
    });

    await t.commit();
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error removing team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
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
        console.log(`Found user guild: ${guildId} for team update`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    }
    
    const team = await db.Team.findOne({
      where: { 
        id: req.params.id,
        guild_id: guildId
      }
    });
    
    if (!team) {
      await t.rollback();
      return res.status(404).json({ error: 'Team not found' });
    }
    
    await team.update({ name: req.body.name }, { transaction: t });
    await t.commit();
    res.json(team);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const teamId = req.params.id;
    
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
        console.log(`Found user guild: ${guildId} for team deletion`);
      } else {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Guild ID is required and no default guild found for user'
        });
      }
    }
    
    // First, delete all team members
    await db.TeamMember.destroy({
      where: { 
        team_id: teamId,
        guild_id: guildId 
      },
      transaction: t
    });

    // Then delete the team
    const result = await db.Team.destroy({
      where: { 
        id: teamId,
        guild_id: guildId
      },
      transaction: t
    });

    if (result === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Team not found' });
    }

    await t.commit();
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting team:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;