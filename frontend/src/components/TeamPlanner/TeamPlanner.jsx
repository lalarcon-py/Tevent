// frontend/src/components/TeamPlanner/TeamPlanner.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import { useParams } from 'react-router-dom';

const DraggableMember = ({ member, onRemove }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('memberId', member.id);
    e.dataTransfer.setData('memberRole', member.role);
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
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <Box>
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

const Team = ({ team, onDrop, onRemove, onRemoveMember }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    onDrop(memberId, team.id);
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
        <Typography variant="h6" sx={{ color: 'white' }}>
          {team.name}
        </Typography>
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
            onRemove={(member) => onRemoveMember(team.id, member)}
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
      const response = await fetch(`http://localhost:5000/api/teams/${teamId}/members/${member.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) throw new Error('Failed to remove team member');
  
      // Add member back to participants list
      setParticipants(prev => [...prev, member]);
      
      // Update teams to remove the member
      setTeams(prev => prev.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            members: team.members.filter(m => m.id !== member.id)
          };
        }
        return team;
      }));
    } catch (error) {
      console.error('Error removing team member:', error);
      setError('Failed to remove team member');
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      // Get the team that's being removed and its members before deletion
      const teamToRemove = teams.find(t => t.id === teamId);
      
      // First, remove all members from the team
      for (const member of teamToRemove.members || []) {
        await handleRemoveMember(teamId, member);
      }
  
      // Then delete the team
      const response = await fetch(`http://localhost:5000/api/teams/${teamId}`, {
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
      const member = participants.find(p => p.id === memberId);
      if (!member) return;

      // Check if member is already in any team
      const isMemberInTeam = teams.some(team => 
        team.members?.some(m => m.user_id === member.user_id)
      );

      if (isMemberInTeam) {
        setError('Member is already assigned to a team');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId: member.user_id,
          role: member.role
        })
      });

      if (!response.ok) throw new Error('Failed to update team member');

      // Remove member from participants list
      setParticipants(prev => 
        prev.filter(p => p.id !== memberId)
      );

      // Update teams data
      const teamsResponse = await fetch(`http://localhost:5000/api/teams/event/${eventId}`, {
        credentials: 'include'
      });
      if (teamsResponse.ok) {
        const updatedTeams = await teamsResponse.json();
        setTeams(updatedTeams);
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