// frontend/src/components/TeamPlanner/TeamList.jsx
import React, { useState } from 'react';
import { Grid, Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Team from './Team';
import TeamDialog from './TeamDialog';

const TeamList = ({ 
  teams, 
  eventId,
  onTeamCreate,
  onTeamUpdate,
  onTeamDelete,
  onMemberMove,
  isAuthorized 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const handleOpenDialog = (team = null) => {
    setSelectedTeam(team);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedTeam(null);
    setDialogOpen(false);
  };

  const handleDrop = (memberId, targetTeamId) => {
    if (!isAuthorized) return;

    const sourceTeamId = teams.find(team => 
      team.members.some(m => m.id === memberId)
    )?.id;

    onMemberMove(memberId, sourceTeamId, targetTeamId);
  };

  const handleSave = async (teamData) => {
    if (selectedTeam) {
      await onTeamUpdate(selectedTeam.id, teamData);
    } else {
      await onTeamCreate(eventId, teamData);
    }
    handleCloseDialog();
  };

  // Calculate needed teams based on total participants
  const calculateNeededTeams = () => {
    const totalParticipants = teams.reduce((sum, team) => 
      sum + team.members.length, 0
    );
    return Math.ceil(totalParticipants / 6);
  };

  const neededTeams = calculateNeededTeams();

  return (
    <Box>
      {isAuthorized && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={teams.length >= neededTeams}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': {
                bgcolor: '#45a049'
              }
            }}
          >
            Create Team
          </Button>
        </Box>
      )}

      <Grid container spacing={2}>
        {teams.map((team) => (
          <Grid item xs={12} md={6} lg={4} key={team.id}>
            <Team
              team={team}
              onEdit={isAuthorized ? handleOpenDialog : undefined}
              onDelete={isAuthorized ? onTeamDelete : undefined}
              onDrop={handleDrop}
              maxMembers={6}
            />
          </Grid>
        ))}
        
        {/* Empty team placeholder */}
        {teams.length < neededTeams && isAuthorized && (
          <Grid item xs={12} md={6} lg={4}>
            <Box 
              sx={{ 
                height: '100%',
                minHeight: 300,
                border: '2px dashed rgba(255, 255, 255, 0.23)',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#1e1e1e',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#4CAF50',
                  bgcolor: 'rgba(76, 175, 80, 0.1)'
                }
              }}
              onClick={() => handleOpenDialog()}
            >
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                  '&:hover': {
                    borderColor: '#4CAF50',
                    color: '#4CAF50'
                  }
                }}
              >
                Create Team
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

      <TeamDialog
        open={dialogOpen}
        team={selectedTeam}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
    </Box>
  );
};

export default TeamList;