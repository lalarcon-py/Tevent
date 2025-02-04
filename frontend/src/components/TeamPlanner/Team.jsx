// frontend/src/components/TeamPlanner/Team.jsx
import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Paper, Typography, Box, IconButton, Grid, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DraggableMember } from './DraggableMember';

const Team = ({ team, onEdit, onDelete, onDrop, maxMembers = 6 }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [teamName, setTeamName] = useState(team.name);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'MEMBER',
    canDrop: () => team.members.length < maxMembers,
    drop: (item) => onDrop(item, team.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }));

  const memberCounts = {
    Tank: team.members.filter(m => m.builds[0]?.spec === 'Tank').length,
    Healer: team.members.filter(m => m.builds[0]?.spec === 'Healer').length,
    DPS: team.members.filter(m => m.builds[0]?.spec === 'DPS').length
  };

  const getBorderColor = () => {
    if (!canDrop) return '#ff4444';
    if (isOver) return '#4CAF50';
    return 'rgba(255, 255, 255, 0.23)';
  };

  const handleNameSave = () => {
    onEdit({ ...team, name: teamName });
    setIsEditingName(false);
  };

  // Create array of 6 slots
  const slots = Array(maxMembers).fill(null).map((_, index) => {
    return team.members[index] || null;
  });

  return (
    <Paper
      ref={drop}
      sx={{
        p: 2,
        bgcolor: '#1e1e1e',
        border: `2px solid ${getBorderColor()}`,
        transition: 'all 0.2s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
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
            {team.name} ({team.members.length}/{maxMembers})
          </Typography>
        )}
        <Box>
          <IconButton 
            onClick={() => setIsEditingName(true)}
            size="small"
            sx={{ color: 'white', mr: 1 }}
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            onClick={() => onDelete(team.id)}
            size="small"
            sx={{ color: '#ff4444' }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ 
        mb: 2,
        display: 'flex',
        gap: 2,
        justifyContent: 'center'
      }}>
        <Typography sx={{ color: '#66b3ff', fontSize: '0.875rem' }}>
          Tanks: {memberCounts.Tank}
        </Typography>
        <Typography sx={{ color: '#66ff66', fontSize: '0.875rem' }}>
          Healers: {memberCounts.Healer}
        </Typography>
        <Typography sx={{ color: '#ff6666', fontSize: '0.875rem' }}>
          DPS: {memberCounts.DPS}
        </Typography>
      </Box>

      <Grid container spacing={1}>
        {slots.map((member, index) => (
          <Grid item xs={12} key={index}>
            <Box
              sx={{
                height: 60,
                border: '1px dashed rgba(255, 255, 255, 0.3)',
                borderRadius: 1,
                bgcolor: isOver && canDrop ? 'rgba(76, 175, 80, 0.1)' : 
                        member ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                transition: 'background-color 0.2s ease',
                p: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {member ? (
                <DraggableMember
                  member={member}
                  roleType={member.builds[0]?.spec}
                />
              ) : (
                <Typography sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  width: '100%'
                }}>
                  Empty Slot
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default Team;