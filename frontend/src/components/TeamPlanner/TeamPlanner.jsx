// frontend/src/components/TeamPlanner/TeamPlanner.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, TextField } from '@mui/material';
import { useParams } from 'react-router-dom';

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
          <DraggableMember key={member.id} member={member} onRemove={() => onRemoveMember(team.id, member)} />
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

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
    
      try {
        const [participantsResponse, teamsResponse] = await Promise.all([
          fetch(`http://localhost:5000/api/events/${eventId}/participants`, {
            credentials: 'include'
          }),
          fetch(`http://localhost:5000/api/teams/event/${eventId}`, {
            credentials: 'include'
          })
        ]);
        
        if (!participantsResponse.ok) {
          throw new Error('Failed to fetch participants');
        }
    
        const [participantsData, teamsData] = await Promise.all([
          participantsResponse.json(),
          teamsResponse.ok ? teamsResponse.json() : []
        ]);
    
        console.log('Raw participants data:', participantsData);
    
        // Filter out participants who are already in teams
        const teamMemberIds = teamsData.flatMap(team => 
          team.members?.map(member => member.user_id) || []
        );
        
        const availableParticipants = participantsData.filter(
          participant => !teamMemberIds.includes(participant.user_id)
        );
    
        setParticipants(availableParticipants);
        setTeams(teamsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      }
    };
  
    fetchData();
  }, [eventId]);

  const handleEditTeam = async (updatedTeam) => {
    try {
      const response = await fetch(`http://localhost:5000/api/teams/${updatedTeam.id}`, {
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
      const response = await fetch('http://localhost:5000/api/teams', {
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
      console.log('Attempting to remove member:', { teamId, member });
  
      if (!member.user_id) {
        console.error('No user_id found on member:', member);
        throw new Error('Invalid member data');
      }
  
      const response = await fetch(`http://localhost:5000/api/teams/${teamId}/members/${member.user_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove team member');
      }
  
      // Add member back to participants list with User data preserved
      const memberWithUser = {
        ...member,
        id: member.user_id,
        User: member.User
      };
      
      // First update participants
      setParticipants(prev => {
        const updatedParticipants = [...prev];
        if (!updatedParticipants.some(p => p.user_id === member.user_id)) {
          updatedParticipants.push(memberWithUser);
        }
        return updatedParticipants;
      });
      
      // Then update teams
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
  
      // First, add all members back to participants pool
      const members = teamToRemove.members || [];
      setParticipants(prev => [...prev, ...members.map(member => ({
        ...member,
        User: member.User
      }))]);
  
      // Then delete the team
      const response = await fetch(`http://localhost:5000/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) throw new Error('Failed to delete team');
      
      // Remove the team from state
      setTeams(prev => prev.filter(team => team.id !== teamId));
    } catch (error) {
      console.error('Error removing team:', error);
      setError('Failed to remove team');
    }
  };

  const handleDrop = async (memberId, teamId) => {
    try {
      // Check if member is in participants pool
      let member = participants.find(p => p.id === memberId);
      let sourceTeamId = null;
  
      // If not in participants, find in which team they are
      if (!member) {
        for (const team of teams) {
          const foundMember = team.members?.find(m => m.id === memberId);
          if (foundMember) {
            member = foundMember;
            sourceTeamId = team.id;
            break;
          }
        }
      }
  
      if (!member) return;
  
      // Don't do anything if dropping into the same team
      if (sourceTeamId === teamId) return;
  
      const response = await fetch(`http://localhost:5000/api/teams/${teamId}/members`, {
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
  
      // Preserve the User data including builds from the original member
      const memberWithUserData = {
        ...updatedMember,
        User: member.User || updatedMember.User // Keep original User data if it exists
      };
  
      // Update state based on where the member came from
      if (sourceTeamId) {
        // Moving between teams
        setTeams(prev => prev.map(team => {
          if (team.id === sourceTeamId) {
            // Remove from source team
            return {
              ...team,
              members: team.members.filter(m => m.id !== memberId)
            };
          }
          if (team.id === teamId) {
            // Add to target team with preserved User data
            return {
              ...team,
              members: [...(team.members || []), memberWithUserData]
            };
          }
          return team;
        }));
      } else {
        // Moving from participants pool
        setParticipants(prev => prev.filter(p => p.id !== memberId));
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
    </Box>
  );
};

export default TeamPlanner;