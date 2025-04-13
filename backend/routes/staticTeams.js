const express = require('express');
const router = express.Router();
const { auth, requireGuildPermissions } = require('../middleware/auth');
const prisma = require('../prisma/client');
const { z } = require('zod');
const { validate } = require('../middleware/validate');

// Get all static teams for a guild
router.get('/', auth, async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Get all static teams for this guild
    const teams = await prisma.staticTeam.findMany({
      where: {
        guildId: parseInt(guildId)
      },
      include: {
        members: {
          include: {
            User: {
              select: {
                id: true,
                username: true,
                builds: true
              }
            }
          }
        }
      }
    });

    return res.json(teams);
  } catch (error) {
    console.error('Error getting static teams:', error);
    return res.status(500).json({ error: 'Failed to get static teams' });
  }
});

// Create a new static team
router.post('/', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { name, guildId } = req.body;
    
    if (!name || !guildId) {
      return res.status(400).json({ error: 'Team name and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Create new static team
    const team = await prisma.staticTeam.create({
      data: {
        name,
        guildId: parseInt(guildId)
      }
    });

    return res.status(201).json(team);
  } catch (error) {
    console.error('Error creating static team:', error);
    return res.status(500).json({ error: 'Failed to create static team' });
  }
});

// Update a static team
router.put('/:id', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, guildId } = req.body;
    
    if (!name || !guildId) {
      return res.status(400).json({ error: 'Team name and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Update the team
    const team = await prisma.staticTeam.update({
      where: {
        id: parseInt(id)
      },
      data: {
        name
      }
    });

    return res.json(team);
  } catch (error) {
    console.error('Error updating static team:', error);
    return res.status(500).json({ error: 'Failed to update static team' });
  }
});

// Delete a static team
router.delete('/:id', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id } = req.params;
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Delete team members first (to avoid foreign key constraints)
    await prisma.staticTeamMember.deleteMany({
      where: {
        teamId: parseInt(id)
      }
    });

    // Delete the team
    await prisma.staticTeam.delete({
      where: {
        id: parseInt(id)
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting static team:', error);
    return res.status(500).json({ error: 'Failed to delete static team' });
  }
});

// Add a member to a static team
router.post('/:id/members', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId, role, sourceTeamId, guildId, selectedBuild } = req.body;
    
    if (!memberId || !role || !guildId) {
      return res.status(400).json({ error: 'Member ID, role, and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // If member is moving from another team, remove them from that team first
    if (sourceTeamId) {
      await prisma.staticTeamMember.deleteMany({
        where: {
          teamId: parseInt(sourceTeamId),
          userId: memberId
        }
      });
    }

    // Add member to the team
    const teamMember = await prisma.staticTeamMember.create({
      data: {
        teamId: parseInt(id),
        userId: memberId,
        role,
        selectedBuild: selectedBuild ? JSON.stringify(selectedBuild) : null
      }
    });

    return res.json(teamMember);
  } catch (error) {
    console.error('Error adding member to static team:', error);
    return res.status(500).json({ error: 'Failed to add member to static team' });
  }
});

// Remove a member from a static team
router.delete('/:id/members/:memberId', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Remove member from the team
    await prisma.staticTeamMember.deleteMany({
      where: {
        teamId: parseInt(id),
        userId: memberId
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error removing member from static team:', error);
    return res.status(500).json({ error: 'Failed to remove member from static team' });
  }
});

// Update a team member's selected build
router.put('/:id/members/:memberId', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { selectedBuild, guildId } = req.body;
    
    if (!selectedBuild || !guildId) {
      return res.status(400).json({ error: 'Selected build and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Update member's selected build
    const teamMember = await prisma.staticTeamMember.updateMany({
      where: {
        teamId: parseInt(id),
        userId: memberId
      },
      data: {
        selectedBuild: JSON.stringify(selectedBuild)
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating team member build:', error);
    return res.status(500).json({ error: 'Failed to update team member build' });
  }
});

// ========== PRESETS API ENDPOINTS ==========

// Get all presets for a guild
router.get('/presets', auth, async (req, res) => {
  try {
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Get all presets for this guild
    const presets = await prisma.staticTeamPreset.findMany({
      where: {
        guildId: parseInt(guildId)
      }
    });

    return res.json(presets);
  } catch (error) {
    console.error('Error getting presets:', error);
    return res.status(500).json({ error: 'Failed to get presets' });
  }
});

// Get a specific preset with its teams
router.get('/presets/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Get the preset
    const preset = await prisma.staticTeamPreset.findUnique({
      where: {
        id: parseInt(id)
      }
    });

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    // Get all teams for this preset
    const teams = await prisma.staticTeam.findMany({
      where: {
        presetId: parseInt(id)
      },
      include: {
        members: {
          include: {
            User: {
              select: {
                id: true,
                username: true,
                builds: true
              }
            }
          }
        }
      }
    });

    // Return preset with teams
    return res.json({
      ...preset,
      teams
    });
  } catch (error) {
    console.error('Error getting preset:', error);
    return res.status(500).json({ error: 'Failed to get preset' });
  }
});

// Create a new preset
router.post('/presets', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { name, guildId, teams } = req.body;
    
    if (!name || !guildId) {
      return res.status(400).json({ error: 'Preset name and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Create new preset
    const preset = await prisma.staticTeamPreset.create({
      data: {
        name,
        guildId: parseInt(guildId)
      }
    });

    // If teams are provided, create them
    if (teams && Array.isArray(teams)) {
      for (const team of teams) {
        // Create the team
        const newTeam = await prisma.staticTeam.create({
          data: {
            name: team.name,
            guildId: parseInt(guildId),
            presetId: preset.id
          }
        });

        // Add members to the team
        if (team.members && Array.isArray(team.members)) {
          for (const member of team.members) {
            await prisma.staticTeamMember.create({
              data: {
                teamId: newTeam.id,
                userId: member.user_id || member.id || member.User?.id,
                role: member.role,
                selectedBuild: member.selectedBuild ? JSON.stringify(member.selectedBuild) : null
              }
            });
          }
        }
      }
    }

    return res.status(201).json(preset);
  } catch (error) {
    console.error('Error creating preset:', error);
    return res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Update a preset
router.put('/presets/:id', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, guildId } = req.body;
    
    if (!name || !guildId) {
      return res.status(400).json({ error: 'Preset name and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Update the preset
    const preset = await prisma.staticTeamPreset.update({
      where: {
        id: parseInt(id)
      },
      data: {
        name
      }
    });

    return res.json(preset);
  } catch (error) {
    console.error('Error updating preset:', error);
    return res.status(500).json({ error: 'Failed to update preset' });
  }
});

// Delete a preset
router.delete('/presets/:id', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id } = req.params;
    const { guildId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Get all teams for this preset
    const teams = await prisma.staticTeam.findMany({
      where: {
        presetId: parseInt(id)
      }
    });

    // Delete team members first
    for (const team of teams) {
      await prisma.staticTeamMember.deleteMany({
        where: {
          teamId: team.id
        }
      });
    }

    // Delete all teams for this preset
    await prisma.staticTeam.deleteMany({
      where: {
        presetId: parseInt(id)
      }
    });

    // Delete the preset
    await prisma.staticTeamPreset.delete({
      where: {
        id: parseInt(id)
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    return res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// Update teams for a preset
router.put('/presets/:id/teams', auth, requireGuildPermissions(['Guild Master', 'Guild Advisor', 'Guild Guardian']), async (req, res) => {
  try {
    const { id } = req.params;
    const { teams, guildId } = req.body;
    
    if (!teams || !Array.isArray(teams) || !guildId) {
      return res.status(400).json({ error: 'Teams array and guild ID are required' });
    }

    // Check if user is part of this guild
    const guildMember = await prisma.guildMember.findFirst({
      where: {
        userId: req.user.id,
        guildId: parseInt(guildId)
      }
    });

    if (!guildMember) {
      return res.status(403).json({ error: 'You are not a member of this guild' });
    }

    // Get current teams for this preset
    const currentTeams = await prisma.staticTeam.findMany({
      where: {
        presetId: parseInt(id)
      }
    });

    // Delete teams that are no longer in the new teams array
    const newTeamIds = teams.filter(t => t.id).map(t => t.id);
    const teamsToDelete = currentTeams.filter(t => !newTeamIds.includes(t.id));
    
    for (const team of teamsToDelete) {
      // Delete team members first
      await prisma.staticTeamMember.deleteMany({
        where: {
          teamId: team.id
        }
      });
      
      // Delete the team
      await prisma.staticTeam.delete({
        where: {
          id: team.id
        }
      });
    }

    // Update or create teams
    for (const team of teams) {
      if (team.id) {
        // Update existing team
        await prisma.staticTeam.update({
          where: {
            id: team.id
          },
          data: {
            name: team.name,
            presetId: parseInt(id)
          }
        });

        // Delete current members
        await prisma.staticTeamMember.deleteMany({
          where: {
            teamId: team.id
          }
        });
      } else {
        // Create new team
        const newTeam = await prisma.staticTeam.create({
          data: {
            name: team.name,
            guildId: parseInt(guildId),
            presetId: parseInt(id)
          }
        });
        
        team.id = newTeam.id;
      }

      // Add members to the team
      if (team.members && Array.isArray(team.members)) {
        for (const member of team.members) {
          const userId = member.user_id || member.id || member.User?.id;
          if (!userId) continue;
          
          await prisma.staticTeamMember.create({
            data: {
              teamId: team.id,
              userId: userId,
              role: member.role,
              selectedBuild: member.selectedBuild ? JSON.stringify(member.selectedBuild) : 
                          member.selected_build ? JSON.stringify(member.selected_build) : null
            }
          });
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating preset teams:', error);
    return res.status(500).json({ error: 'Failed to update preset teams' });
  }
});

module.exports = router;