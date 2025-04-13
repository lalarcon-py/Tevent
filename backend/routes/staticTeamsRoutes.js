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
    
    // Use raw query to avoid Sequelize model issues
    try {
      // First, simply get all the teams for this guild
      const teams = await sequelize.query(`
        SELECT * FROM static_teams WHERE guild_id = :guildId
      `, {
        replacements: { guildId },
        type: sequelize.QueryTypes.SELECT
      });

      // If no teams found, return empty array
      if (!teams || teams.length === 0) {
        return res.json([]);
      }

      // For each team, get its members
      const result = [];
      for (const team of teams) {
        // Format team
        const formattedTeam = {
          id: team.id,
          name: team.name,
          guild_id: team.guild_id,
          description: team.description,
          event_context: team.event_context || 'Main Event',
          player_limit: team.player_limit,
          created_by: team.created_by,
          created_at: team.created_at,
          updated_at: team.updated_at,
          members: []
        };
        
        // Get members for this team
        try {
          const members = await sequelize.query(`
            SELECT stm.*, u.username, u.avatar_url, u.builds, u.combat_power 
            FROM static_team_members as stm
            JOIN users as u ON stm.user_id = u.id
            WHERE stm.team_id = :teamId
          `, {
            replacements: { teamId: team.id },
            type: sequelize.QueryTypes.SELECT
          });
          
          // Format members
          if (members && members.length > 0) {
            formattedTeam.members = members.map(member => ({
              id: member.id,
              team_id: member.team_id,
              user_id: member.user_id,
              guild_id: member.guild_id,
              role: member.role || 'DPS',
              position: member.position || 1,
              selected_build: member.selected_build,
              created_at: member.created_at,
              updated_at: member.updated_at,
              User: {
                id: member.user_id,
                username: member.username,
                avatar_url: member.avatar_url,
                builds: member.builds,
                combat_power: member.combat_power
              }
            }));
          }
        } catch (memberError) {
          console.error('Error fetching team members:', memberError);
          // Continue with empty members array
        }
        
        result.push(formattedTeam);
      }

      res.json(result);
    } catch (queryError) {
      console.error('Error in raw query:', queryError);
      // Return empty teams array as fallback
      return res.json([]);
    }
  } catch (error) {
    console.error('Error fetching static teams:', error);
    // Still return an empty array instead of 500 error
    res.json([]);
  }
});

// Get all event contexts for a guild
router.get('/event-contexts', isAuthenticated, async (req, res) => {
  try {
    // Get guild ID from request
    let guildId = req.guildId || req.query.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }
    
    // Get unique event contexts from the database
    const contexts = await sequelize.query(`
      SELECT DISTINCT event_context FROM static_teams 
      WHERE guild_id = :guildId AND event_context IS NOT NULL
    `, {
      replacements: { guildId },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Extract context values and add default
    const contextValues = contexts
      .map(c => c.event_context)
      .filter(Boolean);
    
    // Always include Main Event
    if (!contextValues.includes('Main Event')) {
      contextValues.push('Main Event');
    }
    
    res.json(contextValues);
  } catch (error) {
    console.error('Error fetching event contexts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update event context name (rename event type)
router.put('/event-contexts/:oldContext', isAuthenticated, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { newContext, guildId } = req.body;
    const oldContext = req.params.oldContext;
    
    if (!oldContext || !newContext || !guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Old context, new context, and guildId are required' });
    }
    
    // Update all teams with the old context
    await sequelize.query(`
      UPDATE static_teams 
      SET event_context = :newContext, updated_at = NOW() 
      WHERE guild_id = :guildId AND event_context = :oldContext
    `, {
      replacements: { oldContext, newContext, guildId },
      type: sequelize.QueryTypes.UPDATE,
      transaction: t
    });
    
    await t.commit();
    res.json({ success: true, message: 'Event context renamed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error updating event context:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new static team (single or multiple)
router.post('/', isAuthenticated, async (req, res) => {
const t = await sequelize.transaction();
try {
// Check if we're creating a single team or multiple teams
const { name, guildId, teams, event_context } = req.body;
    
    // If teams array is provided, create multiple teams
    if (teams && Array.isArray(teams)) {
      if (!guildId) {
        await t.rollback();
        return res.status(400).json({ error: 'GuildId is required' });
      }
      
      // Validate each team in the array
      for (const team of teams) {
        if (!team.name) {
          await t.rollback();
          return res.status(400).json({ error: 'Each team must have a name' });
        }
      }
      
      // Create all teams using raw SQL to avoid model issues
      const createdTeams = [];
      for (const teamData of teams) {
        try {
          // Insert team using raw SQL
          const [result] = await sequelize.query(`
            INSERT INTO static_teams (id, name, description, player_limit, guild_id, created_by, created_at, updated_at)
            VALUES (uuid_generate_v4(), :name, :description, :playerLimit, :guildId, :createdBy, NOW(), NOW())
            RETURNING *
          `, {
            replacements: {
              name: teamData.name,
              description: teamData.description || null,
              playerLimit: teamData.playerLimit || null,
              guildId: guildId,
              createdBy: req.user.id
            },
            type: sequelize.QueryTypes.INSERT,
            transaction: t
          });
          
          // Get the created team
          if (result && result.length > 0) {
            createdTeams.push(result[0]);
          }
        } catch (teamError) {
          console.error('Error creating team with raw SQL:', teamError);
          // Try with Sequelize model as fallback
          try {
            // Create a new static team with minimal required fields
            const team = await db.StaticTeam.create({
              name: teamData.name,
              guild_id: guildId,
              created_by: req.user.id
            }, { transaction: t });
            
            createdTeams.push(team);
          } catch (modelError) {
            console.error('Fallback team creation also failed:', modelError);
            continue; // Skip this team and try the next one
          }
        }
      }
      
      if (createdTeams.length === 0) {
        await t.rollback();
        return res.status(500).json({ error: 'Failed to create any teams' });
      }
      
      await t.commit();
      res.status(201).json(createdTeams);
    } else {
      // Create a single team (original functionality)
      if (!name || !guildId) {
        await t.rollback();
        return res.status(400).json({ error: 'Name and guildId are required' });
      }
      
      try {
        // Try to create using raw SQL first
        const [result] = await sequelize.query(`
          INSERT INTO static_teams (id, name, guild_id, created_by, event_context, created_at, updated_at)
          VALUES (uuid_generate_v4(), :name, :guildId, :createdBy, :eventContext, NOW(), NOW())
          RETURNING *
        `, {
          replacements: {
            name: name,
            guildId: guildId,
            createdBy: req.user.id,
            eventContext: event_context || 'Main Event'
          },
          type: sequelize.QueryTypes.INSERT,
          transaction: t
        });
        
        await t.commit();
        if (result && result.length > 0) {
          res.status(201).json(result[0]);
        } else {
          throw new Error('No team returned from insert');
        }
      } catch (sqlError) {
        console.error('Raw SQL team creation failed:', sqlError);
        
        // Fall back to Sequelize model
        try {
          // Create a new static team with minimal required fields
          const team = await db.StaticTeam.create({
            name,
            guild_id: guildId,
            created_by: req.user.id,
            event_context: event_context || 'Main Event'
          }, { transaction: t });
          
          await t.commit();
          res.status(201).json(team);
        } catch (modelError) {
          await t.rollback();
          console.error('Fallback team creation also failed:', modelError);
          res.status(500).json({ error: 'Failed to create team' });
        }
      }
    }
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
    const { name, guildId, event_context } = req.body;
    const teamId = req.params.id;
    
    if (!name || !guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Name and guildId are required' });
    }
    
    // Event context is optional, but default to Main Event if not provided
    const eventContext = event_context || 'Main Event';
    
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
    await team.update({ 
      name,
      event_context: eventContext 
    }, { transaction: t });
    
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
    const { memberId, role, sourceTeamId } = req.body;
    const teamId = req.params.teamId;
    const guildId = req.body.guildId;
    
    if (!memberId || !guildId) {
      await t.rollback();
      return res.status(400).json({ error: 'Member ID and Guild ID are required' });
    }
    
    // Check if team exists using direct SQL
    try {
      const teams = await sequelize.query(
        'SELECT id FROM static_teams WHERE id = :teamId AND guild_id = :guildId',
        {
          replacements: { teamId, guildId },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      if (!teams || teams.length === 0) {
        await t.rollback();
        return res.status(404).json({ error: 'Static team not found' });
      }
    } catch (checkError) {
      console.error('Error checking if team exists:', checkError);
      // Continue anyway - the insert will fail if the team doesn't exist
    }
    
    // If member is coming from another team, remove them first
    if (sourceTeamId) {
      try {
        await sequelize.query(
          'DELETE FROM static_team_members WHERE team_id = :sourceTeamId AND user_id = :memberId AND guild_id = :guildId',
          {
            replacements: { sourceTeamId, memberId, guildId },
            type: sequelize.QueryTypes.DELETE,
            transaction: t
          }
        );
      } catch (removeError) {
        console.error('Error removing member from source team:', removeError);
        // Continue anyway - we'll still try to add the member to the new team
      }
    }
    
    // Get current position count using direct SQL
    let position = 1;
    try {
      const countResult = await sequelize.query(
        'SELECT COUNT(*) FROM static_team_members WHERE team_id = :teamId AND guild_id = :guildId',
        {
          replacements: { teamId, guildId },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      if (countResult && countResult.length > 0) {
        position = parseInt(countResult[0].count) + 1;
      }
    } catch (countError) {
      console.error('Error getting current position count:', countError);
      // Use default position 1
    }
    
    // Create team member using direct SQL
    try {
      // First, check if the member already exists in this team
      const existingMembers = await sequelize.query(
        'SELECT id FROM static_team_members WHERE team_id = :teamId AND user_id = :memberId',
        {
          replacements: { teamId, memberId },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      if (existingMembers && existingMembers.length > 0) {
        // Member already exists, update their role instead
        await sequelize.query(
          'UPDATE static_team_members SET role = :role WHERE team_id = :teamId AND user_id = :memberId',
          {
            replacements: { teamId, memberId, role: role || 'DPS' },
            type: sequelize.QueryTypes.UPDATE,
            transaction: t
          }
        );
        
        const member = existingMembers[0];
        await t.commit();
        
        // Get member info to return
        try {
          const memberInfo = await sequelize.query(
            `SELECT stm.*, u.username, u.avatar_url, u.builds, u.combat_power 
             FROM static_team_members as stm
             JOIN users as u ON stm.user_id = u.id
             WHERE stm.id = :memberId`,
            {
              replacements: { memberId: member.id },
              type: sequelize.QueryTypes.SELECT
            }
          );
          
          if (memberInfo && memberInfo.length > 0) {
            const formattedMember = {
              ...memberInfo[0],
              User: {
                id: memberInfo[0].user_id,
                username: memberInfo[0].username,
                avatar_url: memberInfo[0].avatar_url,
                builds: memberInfo[0].builds,
                combat_power: memberInfo[0].combat_power
              }
            };
            return res.json(formattedMember);
          }
        } catch (getMemberError) {
          // Failing to get member info isn't critical, just return success
          console.error('Error getting member info:', getMemberError);
        }
        
        return res.json({ success: true, message: 'Member role updated' });
      }
      
      // Insert new member
      const [result] = await sequelize.query(
        `INSERT INTO static_team_members 
         (id, team_id, user_id, guild_id, role, position, created_at, updated_at)
         VALUES (uuid_generate_v4(), :teamId, :memberId, :guildId, :role, :position, NOW(), NOW())
         RETURNING *`,
        {
          replacements: { 
            teamId, 
            memberId, 
            guildId, 
            role: role || 'DPS',
            position
          },
          type: sequelize.QueryTypes.INSERT,
          transaction: t
        }
      );
      
      await t.commit();
      
      if (result && result.length > 0) {
        // Get user info to include in response
        try {
          const userInfo = await sequelize.query(
            'SELECT id, username, avatar_url, builds, combat_power FROM users WHERE id = :userId',
            {
              replacements: { userId: memberId },
              type: sequelize.QueryTypes.SELECT
            }
          );
          
          if (userInfo && userInfo.length > 0) {
            const teamMember = {
              ...result[0],
              User: userInfo[0]
            };
            return res.json(teamMember);
          }
        } catch (userInfoError) {
          console.error('Error getting user info:', userInfoError);
        }
        
        return res.json(result[0]);
      } else {
        throw new Error('No result returned from insert');
      }
    } catch (insertError) {
      // If direct SQL fails, try using the model as fallback
      console.error('Error adding team member with direct SQL:', insertError);
      
      try {
        // Create team member using Sequelize
        const teamMember = await db.StaticTeamMember.create({
          team_id: teamId,
          user_id: memberId,
          guild_id: guildId,
          role: role || 'DPS',
          position: position
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
        return res.json(updatedMember);
      } catch (modelError) {
        await t.rollback();
        console.error('Fallback team member creation also failed:', modelError);
        return res.status(500).json({ error: 'Failed to add team member' });
      }
    }
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
    
    // Get the member details before deleting for potential use later
    try {
      const memberDetails = await sequelize.query(
        `SELECT * FROM static_team_members 
         WHERE team_id = :teamId AND user_id = :memberId AND guild_id = :guildId`,
        {
          replacements: { teamId, memberId, guildId },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      // Delete the team member using direct SQL
      const result = await sequelize.query(
        `DELETE FROM static_team_members 
         WHERE team_id = :teamId AND user_id = :memberId AND guild_id = :guildId
         RETURNING id`,
        {
          replacements: { teamId, memberId, guildId },
          type: sequelize.QueryTypes.DELETE,
          transaction: t
        }
      );
      
      // Check if any rows were deleted
      if (!result || !result[0] || result[0].length === 0) {
        // If nothing was found or deleted, try using the Sequelize model
        try {
          const modelResult = await db.StaticTeamMember.destroy({
            where: {
              team_id: teamId,
              user_id: memberId,
              guild_id: guildId
            },
            transaction: t
          });
          
          if (modelResult === 0) {
            await t.rollback();
            return res.status(404).json({ error: 'Team member not found' });
          }
        } catch (modelError) {
          console.error('Error using model to delete team member:', modelError);
          await t.rollback();
          return res.status(500).json({ error: 'Failed to remove team member' });
        }
      }
      
      await t.commit();
      return res.json({
        success: true,
        message: 'Member removed successfully',
        member: memberDetails && memberDetails.length > 0 ? memberDetails[0] : null
      });
      
    } catch (sqlError) {
      console.error('Error removing team member with direct SQL:', sqlError);
      
      // Try the Sequelize model as a fallback
      try {
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
        return res.json({ message: 'Member removed successfully' });
      } catch (modelError) {
        await t.rollback();
        console.error('Fallback team member deletion also failed:', modelError);
        return res.status(500).json({ error: 'Failed to remove team member' });
      }
    }
  } catch (error) {
    await t.rollback();
    console.error('Error removing team member:', error);
    return res.status(500).json({ error: error.message || 'An unknown error occurred' });
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