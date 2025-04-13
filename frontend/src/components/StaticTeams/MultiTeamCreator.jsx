import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const MultiTeamCreator = ({ open, onClose, onCreateTeams, existingContexts = [] }) => {
  const [teams, setTeams] = useState([{ name: 'Team 1', playerLimit: null }]);
  const [eventContext, setEventContext] = useState('');
  const [newEventContext, setNewEventContext] = useState('');
  const [createNewContext, setCreateNewContext] = useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setTeams([{ name: 'Team 1', playerLimit: null }]);
      setEventContext('');
      setNewEventContext('');
      setCreateNewContext(false);
    }
  }, [open]);

  const handleAddTeam = () => {
    setTeams([...teams, { name: `Team ${teams.length + 1}`, playerLimit: null }]);
  };

  const handleRemoveTeam = (index) => {
    if (teams.length === 1) return;
    
    const newTeams = [...teams];
    newTeams.splice(index, 1);
    
    // Update names to be sequential
    newTeams.forEach((team, idx) => {
      if (team.name.match(/^Team \d+$/)) {
        team.name = `Team ${idx + 1}`;
      }
    });
    
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index, value) => {
    const newTeams = [...teams];
    newTeams[index].name = value;
    setTeams(newTeams);
  };

  const handlePlayerLimitChange = (index, value) => {
    const newTeams = [...teams];
    newTeams[index].playerLimit = value === '' ? null : parseInt(value, 10);
    setTeams(newTeams);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(teams);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update names to be sequential if they follow the "Team X" pattern
    items.forEach((team, idx) => {
      if (team.name.match(/^Team \d+$/)) {
        team.name = `Team ${idx + 1}`;
      }
    });
    
    setTeams(items);
  };

  const handleSubmit = () => {
    const context = createNewContext ? newEventContext : eventContext;
    if (!context) {
      alert('Please select or create an event context');
      return;
    }
    
    // Validate team names
    const hasEmptyName = teams.some(team => !team.name.trim());
    if (hasEmptyName) {
      alert('All teams must have names');
      return;
    }
    
    onCreateTeams(teams, context);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
        Create Multiple Static Teams
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography color="white" sx={{ mb: 2 }}>
            Create multiple teams for a sub-event or special context
          </Typography>
          
          {/* Event Context Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography color="white" sx={{ mb: 1, fontWeight: 500 }}>
              Event Context
            </Typography>
            
            {!createNewContext ? (
              <Grid container spacing={2}>
                <Grid item xs={9}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="event-context-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Select Event Context
                    </InputLabel>
                    <Select
                      labelId="event-context-label"
                      value={eventContext}
                      onChange={(e) => setEventContext(e.target.value)}
                      label="Select Event Context"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                      }}
                    >
                      {existingContexts.map((ctx) => (
                        <MenuItem key={ctx} value={ctx}>{ctx}</MenuItem>
                      ))}
                      {!existingContexts.includes('Sub-Event 1') && (
                        <MenuItem value="Sub-Event 1">Sub-Event 1</MenuItem>
                      )}
                      {!existingContexts.includes('Sub-Event 2') && (
                        <MenuItem value="Sub-Event 2">Sub-Event 2</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <Button 
                    variant="outlined"
                    fullWidth
                    onClick={() => setCreateNewContext(true)}
                    sx={{ height: '100%', color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    Create New
                  </Button>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={9}>
                  <TextField
                    fullWidth
                    label="New Event Context Name"
                    value={newEventContext}
                    onChange={(e) => setNewEventContext(e.target.value)}
                    variant="outlined"
                    sx={{
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <Button 
                    variant="outlined"
                    fullWidth
                    onClick={() => setCreateNewContext(false)}
                    sx={{ height: '100%', color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    Select Existing
                  </Button>
                </Grid>
              </Grid>
            )}
          </Box>
          
          <Typography color="white" variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 500 }}>
            Teams
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddTeam}
              sx={{ ml: 2, color: '#4CAF50', borderColor: '#4CAF50' }}
            >
              Add Team
            </Button>
          </Typography>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="teams">
              {(provided) => (
                <Paper 
                  elevation={0}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)', p: 1, borderRadius: 1 }}
                >
                  {teams.map((team, index) => (
                    <Draggable key={`team-${index}`} draggableId={`team-${index}`} index={index}>
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{
                            p: 2,
                            mb: 1,
                            bgcolor: '#2d2d2d',
                            borderRadius: 1,
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={1} {...provided.dragHandleProps}>
                              <DragIndicatorIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                            </Grid>
                            
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                label="Team Name"
                                value={team.name}
                                onChange={(e) => handleTeamNameChange(index, e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{
                                  '& .MuiInputBase-input': { color: 'white' },
                                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                  }
                                }}
                              />
                            </Grid>
                            
                            <Grid item xs={3}>
                              <TextField
                                fullWidth
                                label="Player Limit (Optional)"
                                value={team.playerLimit === null ? '' : team.playerLimit}
                                onChange={(e) => handlePlayerLimitChange(index, e.target.value)}
                                variant="outlined"
                                size="small"
                                type="number"
                                inputProps={{ min: 1 }}
                                sx={{
                                  '& .MuiInputBase-input': { color: 'white' },
                                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                  }
                                }}
                              />
                            </Grid>
                            
                            <Grid item xs={2}>
                              <IconButton 
                                onClick={() => handleRemoveTeam(index)}
                                disabled={teams.length === 1}
                                sx={{
                                  color: teams.length === 1 ? 'rgba(255, 68, 68, 0.3)' : 'rgba(255, 68, 68, 0.7)',
                                  '&:hover': { 
                                    bgcolor: 'rgba(255, 68, 68, 0.1)',
                                    color: '#ff4444'
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
        <Button 
          onClick={onClose} 
          sx={{ color: 'white' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#45a049' } }}
        >
          Create Teams
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultiTeamCreator;