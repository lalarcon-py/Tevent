const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = require('../config/database');


console.log('Available models in teams.js:', Object.keys(db));
console.log('Team model:', db.Team);

// Get all teams
router.get('/', async (req, res) => {
 try {
   const teams = await db.Team.findAll({
     include: [{
       model: db.TeamMember,
       include: [{
         model: db.User,
         attributes: ['id', 'username', 'avatar_url']
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
         attributes: ['id', 'username', 'avatar_url']
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

    console.log('Adding member to team:', { memberId, role, targetTeamId }); // Debug log

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
        attributes: ['id', 'username', 'avatar_url']
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
    
    await db.TeamMember.destroy({
      where: {
        team_id: teamId,
        id: memberId
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
 try {
   const team = await db.Team.findByPk(req.params.id);
   if (!team) {
     return res.status(404).json({ error: 'Team not found' });
   }
   await team.update({ name: req.body.name });
   res.json(team);
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
});

// Delete team
router.delete('/:id', async (req, res) => {
 try {
   const team = await db.Team.findByPk(req.params.id);
   if (!team) {
     return res.status(404).json({ error: 'Team not found' });
   }
   await team.destroy();
   res.json({ message: 'Team deleted successfully' });
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
});

module.exports = router;