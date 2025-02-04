// EventPlanner/EventDetails.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
  Alert,
  Snackbar,
  Paper,
  Pagination
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { format } from 'date-fns';
import EventForm from './EventForm';

const PARTICIPANTS_PER_PAGE = 10;

const EventDetails = ({ event, onEventUpdate, onClose }) => {
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil((event.participants?.length || 0) / PARTICIPANTS_PER_PAGE);
  const paginatedParticipants = event.participants?.slice(
    (page - 1) * PARTICIPANTS_PER_PAGE,
    page * PARTICIPANTS_PER_PAGE
  );

  // Group participants by role for summary display
  const participantsByRole = {
    TANK: event.participants?.filter(p => p.role === 'TANK').length || 0,
    HEALER: event.participants?.filter(p => p.role === 'HEALER').length || 0,
    DPS: event.participants?.filter(p => p.role === 'DPS').length || 0
  };

  const formatEventTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      return format(date, 'MMMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleSignUp = async (role) => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up');
      }
      await onEventUpdate();
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change role');
      }
      await onEventUpdate();
    } catch (error) {
      console.error('Error changing role:', error);
      setError(error.message);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${event.id}/participants/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to remove participant');
      await onEventUpdate();
    } catch (error) {
      console.error('Error removing participant:', error);
      setError(error.message);
    }
  };

  const ParticipantsList = () => (
    <Paper 
      sx={{ 
        maxHeight: 400, 
        overflow: 'auto',
        bgcolor: '#242424',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1a1a',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
      }}
    >
      <List dense>
        {paginatedParticipants?.map((participant) => (
          <ListItem 
            key={participant.id}
            sx={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              '&:last-child': {
                borderBottom: 'none'
              }
            }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" color="white">
                  {participant.User.username}
                </Typography>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label="Tank"
                    size="small"
                    onClick={() => handleRoleChange(participant.User.id, 'TANK')}
                    color={participant.role === 'TANK' ? 'primary' : 'default'}
                    sx={{ mr: 0.5 }}
                  />
                  <Chip
                    label="Healer"
                    size="small"
                    onClick={() => handleRoleChange(participant.User.id, 'HEALER')}
                    color={participant.role === 'HEALER' ? 'success' : 'default'}
                    sx={{ mr: 0.5 }}
                  />
                  <Chip
                    label="DPS"
                    size="small"
                    onClick={() => handleRoleChange(participant.User.id, 'DPS')}
                    color={participant.role === 'DPS' ? 'error' : 'default'}
                  />
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                onClick={() => handleRemoveParticipant(participant.User.id)}
                size="small"
                sx={{ color: '#ff4444' }}
              >
                <PersonRemoveIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <DialogContent sx={{ bgcolor: '#1a1a1a', color: 'white', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">{event.title}</Typography>
        <Box>
          <Link 
            to={`/events/${event.id}/team-planner`}  // Changed from /team-planner/${event.id}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="contained" color="primary">
              Team Planner
            </Button>
          </Link>
          <Button
            startIcon={<EditIcon />}
            onClick={() => setIsEditDialogOpen(true)}
            sx={{ color: '#90caf9' }}
          >
            Edit
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" color="grey.400">Time</Typography>
          <Typography>{formatEventTime(event.event_time)}</Typography>
          
          <Box mt={2}>
            <Typography variant="subtitle1" color="grey.400">Location</Typography>
            <Typography>{event.location}</Typography>
          </Box>

          <Box mt={2}>
            <Typography variant="subtitle1" color="grey.400">Description</Typography>
            <Typography>{event.description}</Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box mb={3}>
            <Typography variant="h6" mb={2}>Roles Summary</Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Chip 
                  label={`Tanks: ${participantsByRole.TANK}`}
                  color="primary"
                  onClick={() => handleSignUp('TANK')}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`Healers: ${participantsByRole.HEALER}`}
                  color="success"
                  onClick={() => handleSignUp('HEALER')}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'success.dark'
                    }
                  }}
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`DPS: ${participantsByRole.DPS}`}
                  color="error"
                  onClick={() => handleSignUp('DPS')}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'error.dark'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="h6" mb={2}>
              Participants ({event.participants?.length || 0})
            </Typography>
            <ParticipantsList />
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination 
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: 'white'
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <EventForm 
          initialData={{
            ...event,
            eventTime: event.event_time
          }}
          onSubmit={async (updatedData) => {
            try {
              const response = await fetch(`http://localhost:5000/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  ...updatedData,
                  event_time: updatedData.eventTime
                })
              });
              
              if (!response.ok) throw new Error('Failed to update event');
              await onEventUpdate();
              setIsEditDialogOpen(false);
            } catch (error) {
              console.error('Error updating event:', error);
              setError(error.message);
            }
          }}
          onClose={() => setIsEditDialogOpen(false)}
        />
      </Dialog>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </DialogContent>
  );
};

export default EventDetails;