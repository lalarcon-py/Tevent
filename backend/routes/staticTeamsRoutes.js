// backend/routes/staticTeamsRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const { sequelize } = require('../config/database');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all static teams
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get guild ID from request
    let guildId = req.guildId || req.query.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Get all static teams for this guild
    const teams = await db.StaticTeam.findAll({
      where: { guild_id: guildId },
      include: [{
        model: db.StaticTeamMember,
        as: 'members',
        include: [{
          model: db.User,
          attributes: ['id', 'username', 'avatar_url', 'builds', 'combat_power']
        }]
      }]
    });
    
    res.json(teams);
  } catch (error) {
    console.error('Error fetching static teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new static team
router.post('/', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, guildId } = req.body;
    
    if (!name || !guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Name and guildId are required' });
    }
    
    // Create a new static team
    const team = await db.StaticTeam.create({
      name,
      guild_id: guildId,
      created_by: req.user.id
    }, { transaction: t });
    
    await t.commit();
    res.status(201).json(team);
  } catch (error) {
    await t.rollback();
    console.error('Error creating static team:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a static team
router.put('/:id', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, guildId } = req.body;
    const teamId = req.params.id;
    
    if (!name || !guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Name and guildId are required' });
    }
    
    // Find the team
    const team = await db.StaticTeam.findOne({
      where: { 
        id: teamId,
        guild_id: guildId
      },
      transaction: t
    });
    
    if (!team) {
      await t.rollback();
      return res.status(404).json({ error: 'Static team not found' });
    }
    
    // Update the team
    await team.update({ name }, { transaction: t });
    
    await t.commit();
    res.json(team);
  } catch (error) {
    await t.rollback();
    console.error('Error updating static team:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a static team
router.delete('/:id', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const teamId = req.params.id;
    const guildId = req.query.guildId;
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Delete team members first (though this should happen automatically with onDelete CASCADE)
    await db.StaticTeamMember.destroy({
      where: { 
        team_id: teamId,
        guild_id: guildId
      },
      transaction: t
    });
    
    // Delete the team
    const result = await db.StaticTeam.destroy({
      where: { 
        id: teamId,
        guild_id: guildId
      },
      transaction: t
    });
    
    if (result === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Static team not found' });
    }
    
    await t.commit();
    res.json({ message: 'Static team deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting static team:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a member to a static team
router.post('/:teamId/members', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { memberId, role, sourceTeamId, selectedBuild } = req.body;
    const teamId = req.params.teamId;
    const guildId = req.body.guildId;
    
    if (!memberId || !guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Member ID and Guild ID are required' });
    }
    
    // Check if team exists
    const team = await db.StaticTeam.findOne({
      where: { 
        id: teamId,
        guild_id: guildId
      },
      transaction: t
    });
    
    if (!team) {
      await t.rollback();
      return res.status(404).json({ error: 'Static team not found' });
    }
    
    // If member is coming from another team, remove them first
    if (sourceTeamId) {
      await db.StaticTeamMember.destroy({
        where: { 
          team_id: sourceTeamId,
          user_id: memberId,
          guild_id: guildId
        },
        transaction: t
      });
    }
    
    // Get current position count
    const currentMembers = await db.StaticTeamMember.count({
      where: { 
        team_id: teamId,
        guild_id: guildId
      },
      transaction: t
    });
    
    // Create team member
    const teamMember = await db.StaticTeamMember.create({
      team_id: teamId,
      user_id: memberId,
      guild_id: guildId,
      role: role || 'DPS',
      position: currentMembers + 1,
      selected_build: selectedBuild
    }, { transaction: t });
    
    // Get updated member data with user info
    const updatedMember = await db.StaticTeamMember.findOne({
      where: { id: teamMember.id },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'builds', 'combat_power']
      }],
      transaction: t
    });
    
    await t.commit();
    res.json(updatedMember);
  } catch (error) {
    await t.rollback();
    console.error('Error adding team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a member from a static team
router.delete('/:teamId/members/:memberId', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { teamId, memberId } = req.params;
    const guildId = req.query.guildId;
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Delete the team member
    const result = await db.StaticTeamMember.destroy({
      where: {
        team_id: teamId,
        user_id: memberId,
        guild_id: guildId
      },
      transaction: t
    });
    
    if (result === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    await t.commit();
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error removing team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a member's build in a static team
router.put('/:teamId/members/:memberId', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { teamId, memberId } = req.params;
    const { selectedBuild, guildId } = req.body;
    
    if (!guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Find and update the team member
    const teamMember = await db.StaticTeamMember.findOne({
      where: {
        team_id: teamId,
        user_id: memberId,
        guild_id: guildId
      },
      transaction: t
    });
    
    if (!teamMember) {
      await t.rollback();
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    await teamMember.update({ 
      selected_build: selectedBuild 
    }, { transaction: t });
    
    // Get updated member with user info
    const updatedMember = await db.StaticTeamMember.findOne({
      where: { id: teamMember.id },
      include: [{
        model: db.User,
        attributes: ['id', 'username', 'avatar_url', 'builds', 'combat_power']
      }],
      transaction: t
    });
    
    await t.commit();
    res.json(updatedMember);
  } catch (error) {
    await t.rollback();
    console.error('Error updating team member build:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;