const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;

// Get all teams
router.get('/', async (req, res) => {
  try {
    const teams = await db.Team.findAll({
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
    res.status(500).json({ error: error.message });
  }
});

// Get teams for a specific event
router.get('/event/:eventId', async (req, res) => {
  try {
    console.log('Fetching teams for event:', req.params.eventId);
    const teams = await db.Team.findAll({
      where: { event_id: req.params.eventId },
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

    // Process the teams to ensure builds are properly structured
    const processedTeams = teams.map(team => {
      const plainTeam = team.get({ plain: true });
      if (plainTeam.members) {
        plainTeam.members = plainTeam.members.map(member => ({
          ...member,
          User: member.User ? {
            ...member.User,
            builds: Array.isArray(member.User.builds) ? member.User.builds : 
              (typeof member.User.builds === 'string' ? JSON.parse(member.User.builds) : [])
          } : null
        }));
      }
      return plainTeam;
    });

    console.log(`Found ${teams.length} teams`);
    res.json(processedTeams);
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
    
    if (!name || !eventId) {
      await t.rollback();
      return res.status(400).json({ error: 'Name and eventId are required' });
    }

    const team = await db.Team.create({
      name,
      event_id: eventId,
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

    const { memberId, role } = req.body;
    const targetTeamId = req.params.teamId;

    console.log('Adding member to team:', { memberId, role, targetTeamId });

    // Check if team exists
    const targetTeam = await db.Team.findByPk(targetTeamId, { transaction: t });
    if (!targetTeam) {
      await t.rollback();
      return res.status(404).json({ error: 'Target team not found' });
    }

    // Get current position count
    const currentMembers = await db.TeamMember.count({
      where: { team_id: targetTeamId },
      transaction: t
    });

    // Create team member
    const teamMember = await db.TeamMember.create({
      team_id: targetTeamId,
      user_id: memberId,
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

    // Process the member data to ensure builds are properly structured
    const processedMember = updatedMember.get({ plain: true });
    if (processedMember.User) {
      processedMember.User.builds = Array.isArray(processedMember.User.builds) ? 
        processedMember.User.builds : 
        (typeof processedMember.User.builds === 'string' ? 
          JSON.parse(processedMember.User.builds) : []);
    }

    await t.commit();
    res.json(processedMember);
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
    
    await db.TeamMember.destroy({
      where: {
        team_id: teamId,
        user_id: memberId
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
    const team = await db.Team.findByPk(req.params.id);
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
    
    // First, delete all team members
    await db.TeamMember.destroy({
      where: { team_id: teamId },
      transaction: t
    });

    // Then delete the team
    const result = await db.Team.destroy({
      where: { id: teamId },
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