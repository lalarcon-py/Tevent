// EventPlanner/EventDetails.jsx
import { useState } from 'react';
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
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { format } from 'date-fns';
import EventForm from './EventForm';

const EventDetails = ({ event, onEventUpdate, onClose }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <DialogContent sx={{ bgcolor: '#1a1a1a', color: 'white', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">{event.title}</Typography>
        <Button
          startIcon={<EditIcon />}
          onClick={() => setIsEditDialogOpen(true)}
          sx={{ color: '#90caf9' }}
        >
          Edit
        </Button>
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
          <Box mb={2}>
            <Typography variant="h6" mb={2}>Roles Needed</Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Chip 
                  label={`Tanks: ${event.participants?.filter(p => p.role === 'TANK').length || 0}/${event.tanks}`}
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
                  label={`Healers: ${event.participants?.filter(p => p.role === 'HEALER').length || 0}/${event.healers}`}
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
                  label={`DPS: ${event.participants?.filter(p => p.role === 'DPS').length || 0}/${event.dps}`}
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

          <Typography variant="h6" mb={2}>Participants</Typography>
          <List>
            {event.participants?.map((participant) => (
              <ListItem key={participant.id}>
                <ListItemText
                  primary={participant.username}
                  secondary={participant.role}
                  primaryTypographyProps={{ color: 'white' }}
                  secondaryTypographyProps={{ color: 'grey.400' }}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleRemoveParticipant(participant.id)}
                    sx={{ color: '#ff4444' }}
                  >
                    <PersonRemoveIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
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