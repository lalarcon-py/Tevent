// frontend/src/components/TeamPlanner/TeamPlanner.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

const DraggableMember = ({ member, onRemove }) => {
  const [userData, setUserData] = useState(null);
  console.log('Raw member data:', member);
  const builds = member.User?.builds || [];
  console.log('Member User builds:', builds);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('memberId', member.id);
    e.dataTransfer.setData('memberRole', member.role);
  };

  const parseBuilds = (buildsData) => {
    try {
      if (typeof buildsData === 'string') {
        return JSON.parse(buildsData);
      }
      return buildsData;
    } catch (error) {
      console.error('Parse error:', error);
      return [];
    }
  };
  

  // Color based on role
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'tank': return '#66b3ff';
      case 'healer': return '#66ff66';
      case 'dps': return '#ff6666';
      default: return 'white';
    }
  };

  const getWeaponIcon = (weaponName) => {
    if (!weaponName) return null;
    return `/weapons/${weaponName.trim()} Art.png`;
  };

  const parsedBuilds = builds[0] ? 
    (typeof builds[0] === 'string' ? JSON.parse(builds[0]) : builds[0]) 
    : null;

    const primaryWeapon = builds[0]?.[0]?.primary;
    const secondaryWeapon = builds[0]?.[0]?.secondary;
    console.log('Weapons:', { primaryWeapon, secondaryWeapon });

  return (
    <Box
      draggable
      onDragStart={handleDragStart}
      sx={{
        p: 1,
        mb: 1,
        bgcolor: '#2d2d2d',
        cursor: 'grab',
        borderRadius: 1,
        border: `1px solid ${getRoleColor(member.role)}`,
        '&:hover': { 
          bgcolor: '#3d3d3d',
          transform: 'scale(1.02)',
          transition: 'all 0.2s ease'
        },
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '50px' }}>
        {primaryWeapon && (
          <img 
            src={getWeaponIcon(primaryWeapon)}
            alt={primaryWeapon}
            style={{ width: 20, height: 20, objectFit: 'contain' }}
            onError={(e) => {
              console.log('Failed to load image:', e.target.src); // Debug log
              e.target.style.display = 'none';
            }}
          />
        )}
        {secondaryWeapon && (
          <img 
            src={getWeaponIcon(secondaryWeapon)}
            alt={secondaryWeapon}
            style={{ width: 20, height: 20, objectFit: 'contain' }}
            onError={(e) => {
              console.log('Failed to load image:', e.target.src); // Debug log
              e.target.style.display = 'none';
            }}
          />
        )}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ color: 'white' }}>
          {member.User?.username || member.username}
        </Typography>
        <Typography sx={{ 
          color: getRoleColor(member.role),
          fontSize: '0.8rem'
        }}>
          {member.role}
        </Typography>
      </Box>
      {onRemove && (
        <Typography 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(member);
          }}
          sx={{ 
            color: '#ff4444',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0 8px',
            '&:hover': {
              color: '#ff6666'
            }
          }}
        >
          ×
        </Typography>
      )}
    </Box>
  );
};

const Team = ({ team, onDrop, onRemove, onRemoveMember, onEdit }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [teamName, setTeamName] = useState(team.name);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    onDrop(memberId, team.id);
  };

  const handleNameSave = () => {
    onEdit({ ...team, name: teamName });
    setIsEditingName(false);
  };

  return (
    <Paper
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={{ 
        p: 2, 
        bgcolor: '#1e1e1e',
        minHeight: 200
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        {isEditingName ? (
          <TextField
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onBlur={handleNameSave}
            onKeyPress={(e) => e.key === 'Enter' && handleNameSave()}
            autoFocus
            size="small"
            sx={{
              '& .MuiInputBase-input': { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' }
              }
            }}
          />
        ) : (
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'white',
              cursor: 'pointer',
              '&:hover': { color: '#90caf9' }
            }}
            onClick={() => setIsEditingName(true)}
          >
            {team.name}
          </Typography>
        )}
        <Button
          size="small"
          variant="contained"
          onClick={() => onRemove(team.id)}
          sx={{
            bgcolor: '#f44336',
            '&:hover': { bgcolor: '#d32f2f' }
          }}
        >
          Remove Team
        </Button>
      </Box>
      <Box sx={{ minHeight: 100 }}>
        {team.members?.map(member => (
          <DraggableMember 
            key={member.id} 
            member={member} 
            onRemove={() => onRemoveMember(team.id, member)} 
          />
        ))}
      </Box>
    </Paper>
  );
};

const ParticipantPool = ({ participants }) => {
  const roleGroups = {
    Tank: participants.filter(p => p.role?.toLowerCase() === 'tank'),
    Healer: participants.filter(p => p.role?.toLowerCase() === 'healer'),
    DPS: participants.filter(p => p.role?.toLowerCase() === 'dps')
  };

  return (
    <Paper sx={{ p: 2, bgcolor: '#1e1e1e' }}>
      {Object.entries(roleGroups).map(([role, members]) => (
        <Box key={role} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ 
            color: 'white', 
            mb: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            pb: 0.5
          }}>
            {role} ({members.length})
          </Typography>
          <Box sx={{ ml: 1 }}>
            {members.map(member => (
              <DraggableMember 
                key={member.id} 
                member={member} 
              />
            ))}
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

const TeamManagement = ({ onCreateTeam, onRemoveTeam, teamCount }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Button
        variant="contained"
        onClick={onCreateTeam}
        sx={{
          bgcolor: '#4CAF50',
          '&:hover': { bgcolor: '#45a049' }
        }}
      >
        + Add Team
      </Button>
      {teamCount > 0 && (
        <Button
          variant="contained"
          onClick={onRemoveTeam}
          sx={{
            bgcolor: '#f44336',
            '&:hover': { bgcolor: '#d32f2f' }
          }}
        >
          - Remove Team
        </Button>
      )}
    </Box>
  );
};

const TeamPlanner = () => {
  const { eventId } = useParams();
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState([]);
  const [openPresetDialog, setOpenPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  // First useEffect for fetching initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
    
      try {
        // Fetch all events first
        const [eventsResponse, teamsResponse] = await Promise.all([
          fetch(`${API_URL}/api/events`, {
            credentials: 'include'
          }),
          fetch(`${API_URL}/api/teams/event/${eventId}`, {
            credentials: 'include'
          })
        ]);
        
        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch events data');
        }
    
        // Process the responses
        const [eventsData, teamsData] = await Promise.all([
          eventsResponse.json(),
          teamsResponse.ok ? teamsResponse.json() : []
        ]);
    
        // Find the specific event from the list
        const eventData = eventsData.find(event => event.id === eventId);
        
        if (!eventData) {
          throw new Error(`Event with ID ${eventId} not found`);
        }
    
        console.log('Found event data:', eventData);
        
        // Extract participants from event data
        const participantsData = eventData.participants || [];
    
        console.log('Participants data:', participantsData);
    
        // Filter out participants who are already in teams
        const teamMemberIds = teamsData.flatMap(team => 
          team.members?.map(member => member.user_id || member.User?.id) || []
        );
        
        const availableParticipants = participantsData.filter(participant => {
          const participantId = participant.user_id || participant.User?.id;
          return !teamMemberIds.includes(participantId);
        });
    
        // Format participants to ensure they have the correct structure
        const formattedParticipants = availableParticipants.map(participant => {
          // Ensure participant has builds array
          let builds = participant.User?.builds || participant.builds || [];
          
          // If builds is a string, parse it
          if (typeof builds === 'string') {
            try {
              builds = JSON.parse(builds);
            } catch (error) {
              console.error('Error parsing builds:', error);
              builds = [];
            }
          }
          
          // Ensure builds is an array
          builds = Array.isArray(builds) ? builds : [];
          
          return {
            ...participant,
            User: {
              ...(participant.User || {}),
              builds: builds
            },
            builds: builds
          };
        });
    
        setParticipants(formattedParticipants);
        setTeams(teamsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to load data');
      }
    };
  
    fetchData();
  }, [eventId]);

  const handleEditTeam = async (updatedTeam) => {
    try {
      const response = await fetch(`${API_URL}/api/teams/${updatedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: updatedTeam.name })
      });
  
      if (!response.ok) throw new Error('Failed to update team');
      setTeams(prev => prev.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      ));
    } catch (error) {
      setError('Failed to update team name');
    }
  };

  const handleCreateTeam = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `Team ${teams.length + 1}`,
          eventId
        })
      });

      if (!response.ok) throw new Error('Failed to create team');
      const newTeam = await response.json();
      setTeams(prev => [...prev, { ...newTeam, members: [] }]);
    } catch (error) {
      setError('Failed to create team');
    }
  };

  const handleRemoveMember = async (teamId, member) => {
    try {
      if (!member.user_id) {
        throw new Error('Invalid member data');
      }
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members/${member.user_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove team member');
      }
  
      const memberExists = participants.some(p => p.user_id === member.user_id);
      if (!memberExists) {
        const memberWithUser = formatMemberWithBuilds({
          ...member,
          id: member.user_id,
          User: member.User
        });
        setParticipants(prev => [...prev, memberWithUser]);
      }
  
      setTeams(prev => prev.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            members: team.members.filter(m => m.user_id !== member.user_id)
          };
        }
        return team;
      }));
  
    } catch (error) {
      console.error('Error removing team member:', error);
      setError(error.message || 'Failed to remove team member');
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      const teamToRemove = teams.find(t => t.id === teamId);
      if (!teamToRemove) return;
  
      const members = teamToRemove.members || [];
      setParticipants(prev => [...prev, ...members.map(member => ({
        ...member,
        User: member.User
      }))]);
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) throw new Error('Failed to delete team');
      setTeams(prev => prev.filter(team => team.id !== teamId));
    } catch (error) {
      console.error('Error removing team:', error);
      setError('Failed to remove team');
    }
  };

  const handleDrop = async (memberId, teamId) => {
    try {
      // Check if member is in participants pool
      let member = participants.find(p => p.id === memberId || p.user_id === memberId);
      let sourceTeamId = null;
  
      // If not in participants, find in which team they are
      if (!member) {
        for (const team of teams) {
          const foundMember = team.members?.find(m => m.id === memberId || m.user_id === memberId);
          if (foundMember) {
            member = foundMember;
            sourceTeamId = team.id;
            break;
          }
        }
      }
  
      if (!member) return;
      if (sourceTeamId === teamId) return;
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId: member.user_id || member.id,
          role: member.role,
          sourceTeamId
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team member');
      }
  
      const updatedMember = await response.json();
  
      // Format member with builds properly preserved
      const memberWithUserData = formatMemberWithBuilds({
        ...updatedMember,
        User: {
          ...member.User,
          builds: member.User?.builds || member.builds || []
        }
      });
  
      if (sourceTeamId) {
        setTeams(prev => prev.map(team => {
          if (team.id === sourceTeamId) {
            return {
              ...team,
              members: team.members.filter(m => m.id !== memberId && m.user_id !== memberId)
            };
          }
          if (team.id === teamId) {
            return {
              ...team,
              members: [...(team.members || []), memberWithUserData]
            };
          }
          return team;
        }));
      } else {
        setParticipants(prev => prev.filter(p => p.id !== memberId && p.user_id !== memberId));
        setTeams(prev => prev.map(team => {
          if (team.id === teamId) {
            return {
              ...team,
              members: [...(team.members || []), memberWithUserData]
            };
          }
          return team;
        }));
      }
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    }
  };

  const handleSavePreset = async () => {
    try {
      const response = await fetch(`${API_URL}/api/team-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: presetName,
          eventId,
          teamsData: teams
        })
      });
  
      if (!response.ok) throw new Error('Failed to save preset');
      setOpenPresetDialog(false);
      setPresetName('');
    } catch (error) {
      setError('Failed to save preset');
    }
  };

  const loadPresets = async () => {
    try {
      const response = await fetch(`${API_URL}/api/team-presets/event/${eventId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load presets');
      const data = await response.json();
      setPresets(data);
    } catch (error) {
      setError('Failed to load presets');
    }
  };

  const cleanupExistingTeams = async () => {
    try {
      await Promise.all(
        teams.map(team => 
          fetch(`${API_URL}/api/teams/${team.id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        )
      );
    } catch (error) {
      console.error('Error cleaning up teams:', error);
    }
  };


  const loadPreset = async (presetId) => {
    try {
      await cleanupExistingTeams();
  
      const response = await fetch(`${API_URL}/api/team-presets/${presetId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load preset');
      const data = await response.json();
  
      const presetMemberIds = new Set(
        data.teams_data.flatMap(team => 
          (team.members || []).map(member => member.user_id)
        )
      );
  
      setParticipants(prev => 
        prev.filter(participant => !presetMemberIds.has(participant.user_id))
          .map(participant => formatMemberWithBuilds(participant))
      );
  
      const createdTeams = await Promise.all(
        data.teams_data.map(async (teamData) => {
          const createTeamResponse = await fetch(`${API_URL}/api/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: teamData.name,
              eventId
            })
          });
  
          if (!createTeamResponse.ok) {
            throw new Error('Failed to create team from preset');
          }
  
          const newTeam = await createTeamResponse.json();
  
          if (teamData.members && teamData.members.length > 0) {
            await Promise.all(
              teamData.members.map(async (member) => {
                const memberInOtherTeam = teams.some(team => 
                  team.members?.some(m => m.user_id === member.user_id)
                );
  
                if (!memberInOtherTeam) {
                  await fetch(`${API_URL}/api/teams/${newTeam.id}/members`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      memberId: member.user_id,
                      role: member.role
                    })
                  });
                }
              })
            );
          }
  
          return {
            ...newTeam,
            members: (teamData.members || []).map(member => formatMemberWithBuilds(member))
          };
        })
      );
  
      setTeams(createdTeams);
    } catch (error) {
      console.error('Error loading preset:', error);
      setError('Failed to load preset');
    }
  };

  const isDuplicateMember = (memberId) => {
    // Check teams
    const inTeams = teams.some(team => 
      team.members?.some(member => member.user_id === memberId)
    );
    
    // Check participants
    const inParticipants = participants.some(
      participant => participant.user_id === memberId
    );
  
    return inTeams || inParticipants;
  };

  const formatMemberWithBuilds = (member) => {
    let builds = member.User?.builds || member.builds || [];
    
    // If builds is a string, parse it
    if (typeof builds === 'string') {
      try {
        builds = JSON.parse(builds);
      } catch (e) {
        console.error('Error parsing builds:', e);
        builds = [];
      }
    }
  
    // Ensure builds is an array
    builds = Array.isArray(builds) ? builds : [];
  
    return {
      ...member,
      User: {
        ...member.User,
        builds: builds
      },
      builds: builds
    };
  };

  const [deletePresetDialog, setDeletePresetDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);

  const handleDeletePreset = async (preset) => {
    try {
      const response = await fetch(`${API_URL}/api/team-presets/${preset.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) throw new Error('Failed to delete preset');
      
      // Remove the deleted preset from the list
      setPresets(prev => prev.filter(p => p.id !== preset.id));
      setDeletePresetDialog(false);
      setPresetToDelete(null);
    } catch (error) {
      console.error('Error deleting preset:', error);
      setError('Failed to delete preset');
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3, color: 'error.main' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          Team Planner
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => setOpenPresetDialog(true)}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#45a049' }
            }}
          >
            Save as Preset
          </Button>
          <Button
            variant="contained"
            onClick={loadPresets}
            sx={{
              bgcolor: '#2196F3',
              '&:hover': { bgcolor: '#1976D2' }
            }}
          >
            Load Preset
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTeam}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#45a049' }
            }}
          >
            Create Team
          </Button>
        </Box>
      </Box>
  
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <ParticipantPool participants={participants} />
        </Grid>
  
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            {teams.map(team => (
              <Grid item xs={12} md={6} lg={4} key={team.id}>
                <Team 
                  team={team} 
                  onDrop={handleDrop}
                  onRemove={handleRemoveTeam}
                  onRemoveMember={handleRemoveMember}
                  onEdit={handleEditTeam}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
  
      {/* Save Preset Dialog */}
      <Dialog open={openPresetDialog} onClose={() => setOpenPresetDialog(false)}>
        <DialogTitle>Save Team Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            fullWidth
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{
              '& .MuiInputBase-input': { color: 'white' },
              '& .MuiInputLabel-root': { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPresetDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePreset}>Save</Button>
        </DialogActions>
      </Dialog>
  
      {/* Load Preset Dialog */}
      <Dialog open={!!presets.length} onClose={() => setPresets([])}>
        <DialogTitle>Load Preset</DialogTitle>
        <List>
          {presets.map((preset) => (
            <ListItem
              key={preset.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                pr: 2
              }}
            >
              <ListItemText 
                primary={preset.name}
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  loadPreset(preset.id);
                  setPresets([]);
                }}
              />
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => {
                  setPresetToDelete(preset);
                  setDeletePresetDialog(true);
                }}
              >
                Delete
              </Button>
            </ListItem>
          ))}
        </List>
      </Dialog>
  
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deletePresetDialog} 
        onClose={() => {
          setDeletePresetDialog(false);
          setPresetToDelete(null);
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the "{presetToDelete?.name}" Preset?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeletePresetDialog(false);
              setPresetToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            color="error"
            onClick={() => handleDeletePreset(presetToDelete)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamPlanner;