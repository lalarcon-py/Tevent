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
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

const DraggableMember = ({ member, onRemove }) => {
  const dragRef = React.useRef(null);
  
  React.useEffect(() => {
    const currentEl = dragRef.current;
    if (!currentEl) return;
    
    const handleDragStart = (e) => {
      console.log('Drag started!');
      const memberId = member.user_id || member.id || (member.User?.id);
      
      if (!memberId) {
        console.error('No valid ID found for member:', member);
        e.preventDefault();
        return;
      }
      
      console.log('Setting drag data with ID:', memberId);

      try {
        e.dataTransfer.setData('text/plain', memberId);
        e.dataTransfer.setData('memberId', memberId);
      } catch (err) {
        console.error('Error setting drag data:', err);
      }
      
      currentEl.classList.add('dragging');
    };
    
    const handleDragEnd = () => {
      currentEl.classList.remove('dragging');
    };
    
    // Directly attach event listeners to the DOM element
    currentEl.setAttribute('draggable', 'true');
    currentEl.addEventListener('dragstart', handleDragStart);
    currentEl.addEventListener('dragend', handleDragEnd);
    
    // Clean up event listeners
    return () => {
      currentEl.removeEventListener('dragstart', handleDragStart);
      currentEl.removeEventListener('dragend', handleDragEnd);
    };
  }, [member]);
  
  // Color based on role
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'tank': return '#66b3ff';
      case 'healer': return '#66ff66';
      case 'dps': return '#ff6666';
      default: return 'white';
    }
  };

  return (
    <Box 
      ref={dragRef} 
      draggable={true}
      sx={{
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 1,
        p: 0.5,
        mb: 0.5,
        bgcolor: getRoleColor(member.role),
        cursor: 'grab',
        transition: 'transform 0.15s',
        '&:hover': {
          transform: 'scale(1.02)'
        },
        '&.dragging': {
          opacity: 0.5
        },
        minWidth: 120,
        maxWidth: 200
      }}
    >
      {/* Character name */}
      <Typography 
        variant="body2"
        sx={{
          fontSize: '0.85rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {member.User?.username || member.username}
      </Typography>
      
      {/* Role text */}
      <Typography 
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.75rem'
        }}
      >
        {member.role}
      </Typography>
      
      {/* Remove button */}
      {onRemove && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            onRemove(member);
          }}
          sx={{
            color: '#ff4444',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0 4px',
            float: 'right',
            mt: -2.5
          }}
        >
          ×
        </Box>
      )}
    </Box>
  );
};

const Team = ({ team, onDrop, onRemove, onRemoveMember, onEdit }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };
  
  const handleDragLeave = () => {
    setIsDropTarget(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDropTarget(false);

    let memberId;
    try {
      memberId = e.dataTransfer.getData('memberId');
      if (!memberId) {
        const jsonData = e.dataTransfer.getData('application/json');
        if (jsonData) {
          const data = JSON.parse(jsonData);
          memberId = data.id;
        }
      }
      if (!memberId) {
        memberId = e.dataTransfer.getData('text/plain');
      }
    } catch (err) {
      console.error('Error getting drag data:', err);
    }
    
    console.log('Team received drop with member ID:', memberId);
    
    if (!memberId) {
      console.error('No member ID received in drop event');
      return;
    }
    
    onDrop(memberId, team.id);
  };

  const handleNameSave = () => {
    onEdit({ ...team, name: teamName });
    setIsEditingName(false);
  };

  return (
    <Paper
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{ 
        p: 2, 
        bgcolor: isDropTarget ? 'rgba(30, 30, 30, 0.9)' : '#1e1e1e',
        minHeight: 200,
        border: isDropTarget ? '2px dashed #4CAF50' : '2px solid transparent',
        transition: 'all 0.2s ease'
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
            key={member.id || member.user_id || (member.User && member.User.id)} 
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
  const [guildId, setGuildId] = useState(null);
  const [absentees, setAbsentees] = useState([]);
  const [isAnnouncingTeams, setIsAnnouncingTeams] = useState(false);
  const [announceSuccess, setAnnounceSuccess] = useState(null);

  // First useEffect for fetching initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
    
      try {
        // Wait for guild ID to be available, if needed
        if (!guildId) {
          console.log('Waiting for guild ID...');
          return;
        }
        
        console.log(`Fetching data with guild ID: ${guildId}`);
        
        // Fetch all events first
        const [eventsResponse, teamsResponse] = await Promise.all([
          fetch(`${API_URL}/api/events?guildId=${guildId}`, {
            credentials: 'include'
          }),
          fetch(`${API_URL}/api/teams/event/${eventId}?guildId=${guildId}`, {
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

        try {
          const absenteesResponse = await fetch(`${API_URL}/api/events/${eventId}/absentees?guildId=${guildId}`, {
            credentials: 'include'
          });
          
          if (absenteesResponse.ok) {
            const absenteesData = await absenteesResponse.json();
            setAbsentees(absenteesData);
          }
        } catch (error) {
          console.error('Error fetching absentees:', error);
        }
        
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
        const formattedParticipants = availableParticipants.map(participant => formatMemberWithBuilds(participant));
    
        setParticipants(formattedParticipants);
        setTeams(teamsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to load data');
      }
    };
  
    fetchData();
  }, [eventId, guildId]);

  useEffect(() => {
    const fetchGuildId = async () => {
      try {
        const response = await fetch(`${API_URL}/api/guilds/my-guilds`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const guilds = await response.json();
          if (guilds.length > 0) {
            setGuildId(guilds[0].id);
            console.log('Using guild ID for team planner:', guilds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching guild ID:', error);
      }
    };
    
    fetchGuildId();
  }, []);

  const handleAnnounceTeams = async () => {
    if (teams.length === 0) {
      setAnnounceSuccess({
        success: false,
        message: "Can't announce teams: No teams created"
      });
      return;
    }
    
    try {
      setIsAnnouncingTeams(true);
      
      // Format teams data
      const teamsData = teams.map(team => ({
        id: team.id,
        name: team.name,
        members: team.members.map(member => ({
          id: member.user_id || member.id || (member.User?.id),
          username: member.User?.username || member.username,
          role: member.role
        }))
      }));
      
      const response = await fetch(`${API_URL}/api/discord-bot/announce-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          guildId,
          teams: teamsData
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to announce teams');
      }
      
      setAnnounceSuccess({
        success: true,
        message: "Teams announced successfully to Discord!"
      });
    } catch (error) {
      console.error('Error announcing teams:', error);
      setAnnounceSuccess({
        success: false,
        message: error.message || 'Failed to announce teams'
      });
    } finally {
      setIsAnnouncingTeams(false);
    }
  };
  const handleCloseSnackbar = () => {
    setAnnounceSuccess(null);
  };

  const handleSignUpAbsentee = async (memberId, role) => {
    try {
      const response = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId: memberId,
          role,
          guildId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up member');
      }
      
      // Update local state
      const member = absentees.find(m => m.id === memberId);
      if (member) {
        setAbsentees(prev => prev.filter(m => m.id !== memberId));
        setParticipants(prev => [...prev, {...member, role}]);
      }
      
    } catch (error) {
      console.error('Error signing up absentee:', error);
      setError(error.message || 'Failed to sign up member');
    }
  };

  const handleEditTeam = async (updatedTeam) => {
    try {
      const response = await fetch(`${API_URL}/api/teams/${updatedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: updatedTeam.name,
          guildId: guildId
        })
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
          eventId,
          guildId: guildId
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
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members/${member.user_id}?guildId=${guildId}`, {
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
      setParticipants(prev => [...prev, ...members.map(member => formatMemberWithBuilds({
        ...member,
        User: member.User
      }))]);
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}?guildId=${guildId}`, {
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
      let member = participants.find(p => 
        p.id === memberId || p.user_id === memberId || 
        (p.User && p.User.id === memberId)
      );
      let sourceTeamId = null;
  
      if (!member) {
        for (const team of teams) {
          const foundMember = team.members?.find(m => 
            m.id === memberId || m.user_id === memberId || 
            (m.User && m.User.id === memberId)
          );
          if (foundMember) {
            member = foundMember;
            sourceTeamId = team.id;
            break;
          }
        }
      }
  
      if (!member) {
        return;
      }
      
      if (sourceTeamId === teamId) {
        return;
      }
      
      const userId = member.user_id || member.id || (member.User && member.User.id);
      if (!userId) {
        console.error('Unable to determine user ID from member:', member);
        throw new Error('Invalid member data - missing user ID');
      }
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId: userId,
          role: member.role,
          sourceTeamId,
          guildId: guildId
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team member');
      }
  
      const updatedMember = await response.json();
      console.log('Updated member response:', updatedMember);
  
      const memberWithUserData = formatMemberWithBuilds({
        ...updatedMember,
        User: {
          ...(member.User || {}),
          builds: member.User?.builds || member.builds || []
        }
      });
  
      if (sourceTeamId) {
        setTeams(prev => prev.map(team => {
          if (team.id === sourceTeamId) {
            return {
              ...team,
              members: team.members.filter(m => 
                m.id !== memberId && 
                m.user_id !== memberId && 
                (m.User?.id !== memberId)
              )
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
        setParticipants(prev => prev.filter(p => 
          p.id !== memberId && 
          p.user_id !== memberId && 
          (p.User?.id !== memberId)
        ));
        
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
          teamsData: teams,
          guildId: guildId
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
      const response = await fetch(`${API_URL}/api/team-presets/event/${eventId}?guildId=${guildId}`, {
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
          fetch(`${API_URL}/api/teams/${team.id}?guildId=${guildId}`, {
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
  
      const response = await fetch(`${API_URL}/api/team-presets/${presetId}?guildId=${guildId}`, {
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
              eventId,
              guildId: guildId
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
                      role: member.role,
                      guildId: guildId
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
      setPresets([]);
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
    if (!member) return null;
    
    console.log('Formatting member:', member);
    
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
  
    // Ensure User property exists
    const userInfo = member.User || {};
  
    return {
      ...member,
      user_id: member.user_id || member.id || userInfo.id,
      User: {
        ...userInfo,
        id: userInfo.id || member.user_id || member.id,
        builds: builds
      },
      builds: builds
    };
  };

  const [deletePresetDialog, setDeletePresetDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);

  const handleDeletePreset = async (preset) => {
    try {
      const response = await fetch(`${API_URL}/api/team-presets/${preset.id}?guildId=${guildId}`, {
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
          <Button
            variant="contained"
            onClick={handleAnnounceTeams}
            disabled={isAnnouncingTeams || teams.length === 0}
            startIcon={<SendIcon />}
            sx={{
              bgcolor: '#9c27b0',
              '&:hover': { bgcolor: '#7B1FA2' },
              '&.Mui-disabled': { bgcolor: 'rgba(156, 39, 176, 0.3)' }
            }}
          >
            {isAnnouncingTeams ? 'Sending...' : 'Announce Teams'}
          </Button>
        </Box>
      </Box>
  
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <ParticipantPool participants={participants} />
          
          {/* Absentees Section */}
          <Paper sx={{ p: 2, mt: 2, bgcolor: '#1e1e1e' }}>
            <Typography variant="h6" sx={{ 
              color: 'white', 
              mb: 1,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              pb: 0.5
            }}>
              Absent Members ({absentees?.length || 0})
            </Typography>
            {absentees && absentees.length > 0 ? (
              <Box sx={{ ml: 1 }}>
                {absentees.map(member => (
                  <Box
                    key={member.id || member.user_id}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 1,
                      p: 0.5,
                      mb: 0.5,
                      bgcolor: '#555',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Typography 
                      variant="body2"
                      sx={{
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {member.User?.username || member.username}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        minWidth: '60px',
                        fontSize: '0.7rem',
                        ml: 1,
                        color: '#90caf9',
                        borderColor: '#90caf9'
                      }}
                      onClick={() => handleSignUpAbsentee(member.id || member.user_id, 'DPS')}
                    >
                      Add
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                No absent members
              </Typography>
            )}
          </Paper>
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
  
      {/* Team announcement notification */}
      <Snackbar 
        open={announceSuccess !== null} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={announceSuccess?.success ? "success" : "error"}
          sx={{ width: '100%' }}
        >
          {announceSuccess?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamPlanner;