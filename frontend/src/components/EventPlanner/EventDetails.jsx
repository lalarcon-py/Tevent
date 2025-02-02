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
  Dialog
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { format } from 'date-fns';
import EventForm from './EventForm';

const EventDetails = ({ event, onEventUpdate }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      
      if (!response.ok) throw new Error('Failed to sign up');
      onEventUpdate();
    } catch (error) {
      console.error('Error signing up:', error);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${event.id}/participants/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to remove participant');
      onEventUpdate();
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  return (
    <Box sx={{ color: 'white' }}>
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
          <Typography>{format(new Date(event.eventTime), 'MMMM dd, yyyy HH:mm')}</Typography>
          
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
            <Typography variant="h6">Roles Needed</Typography>
            <Grid container spacing={2} mt={1}>
              <Grid item>
                <Chip 
                  label={`Tanks: ${event.participants?.filter(p => p.role === 'TANK').length || 0}/${event.tanks}`}
                  color="primary"
                  onClick={() => handleSignUp('TANK')}
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`Healers: ${event.participants?.filter(p => p.role === 'HEALER').length || 0}/${event.healers}`}
                  color="success"
                  onClick={() => handleSignUp('HEALER')}
                />
              </Grid>
              <Grid item>
                <Chip 
                  label={`DPS: ${event.participants?.filter(p => p.role === 'DPS').length || 0}/${event.dps}`}
                  color="error"
                  onClick={() => handleSignUp('DPS')}
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
          initialData={event}
          onSubmit={async (updatedData) => {
            try {
              const response = await fetch(`http://localhost:5000/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(updatedData)
              });
              
              if (!response.ok) throw new Error('Failed to update event');
              onEventUpdate();
              setIsEditDialogOpen(false);
            } catch (error) {
              console.error('Error updating event:', error);
            }
          }}
          onClose={() => setIsEditDialogOpen(false)}
        />
      </Dialog>
    </Box>
  );
};

export default EventDetails;