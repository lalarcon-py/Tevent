// EventDetails.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Pagination,
  DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { format } from 'date-fns';
import EventForm from './EventForm';
import { useGuildSettings } from '../../contexts/GuildSettingsContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';

const PARTICIPANTS_PER_PAGE = 10;
const API_URL = process.env.REACT_APP_API_URL;

const EventDetails = ({ event, onEventUpdate, onClose }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [guildId, setGuildId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { settings } = useGuildSettings();
  const isDkpEnabled = settings?.dkpEnabled === true;
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

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
            console.log('Using guild ID for event details:', guilds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching user guilds:', error);
      }
    };
    
    fetchGuildId();
  }, []);

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

  const signUpWithPrimaryBuild = async () => {
    try {
      setLoading(true); // Now properly defined
      if (!currentUser) {
        setError('You must be logged in to sign up');
        return;
      }
  
      // Get current user data to determine primary build
      const userResponse = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // Check if user has builds
      if (!userData.builds || userData.builds.length === 0) {
        setError("Could not find your primary build. Please set up your builds first.");
        return;
      }
      
      // Get the primary build (first build)
      const primaryBuild = userData.builds[0];
      
      // Determine role based on the build's spec
      let role;
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // Sign up with the determined role
      await handleSignUp(role);
      setSuccessMessage(`Successfully signed up as ${role}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Error signing up with primary build:', error);
      setError(error.message || 'Failed to sign up with primary build');
    } finally {
      setLoading(false); // Now properly defined
    }
  };

  const handleSignUp = async (role) => {
    try {
      if (!currentUser) {
        setError('You must be logged in to sign up');
        return;
      }
  
      // Check if user is already signed up for this event with any role
      const existingSignup = event.participants?.find(p => p.User?.id === currentUser.id);
      
      if (existingSignup) {
        // If already signed up with the same role, do nothing
        if (existingSignup.role === role) {
          return;
        }
        
        // If signed up with different role, remove the existing signup first
        await handleRemoveParticipant(currentUser.id);
      }
      
      console.log(`Signing up for role ${role} with guild ID: ${guildId}`);
      
      // Now proceed with the new signup
      const response = await fetch(`${API_URL}/api/events/${event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          guildId: guildId // Add this line
        })
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
      await handleRemoveParticipant(userId);
      const response = await fetch(`${API_URL}/api/events/${event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role: newRole, 
          userId,
          guildId: guildId // Add this line
        })
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
      const response = await fetch(`${API_URL}/api/events/${event.id}/signup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId,
          guildId: guildId // Add this line
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participant');
      }
      
      await onEventUpdate();
    } catch (error) {
      console.error('Error removing participant:', error);
      setError(error.message);
    }
  };

  const markAsAbsent = async (eventId) => {
    try {
      // Directly mark as absent without checking participation first
      const response = await fetch(`${API_URL}/api/events/${eventId || event.id}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role: 'ABSENT',
          guildId: localStorage.getItem('guildId')
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as absent');
      }
      
      // Refresh event data
      if (onEventUpdate) {
        await onEventUpdate();
      }
      
      setSuccessMessage("You've been marked as absent for this event");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error marking as absent:', error);
      setError(error.message || 'Failed to mark as absent');
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/events`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      
      // Filter for upcoming events only
      const upcomingEvents = data
        .filter(event => {
          const eventDate = new Date(event.event_time);
          const now = new Date();
          return eventDate > now;
        })
        .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
      
      // Call onEventUpdate instead of using setEvents
      onEventUpdate();
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEvent = async () => {
    if (!event) return;
  
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setIsDeleting(true);
  
    try {
      const response = await fetch(
        `${API_URL}/api/events/${event.id}?guildId=${guildId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      onEventUpdate();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
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
            to={`/events/${event.id}/team-planner`}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="contained" color="primary" sx={{ mr: 1 }}>
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
  
      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {/* Error message */}
      {error && (
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
  
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
          
          {/* Display DKP value only if DKP is enabled */}
          {isDkpEnabled && event.dkp_value > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1" color="grey.400">DKP Value</Typography>
              <Typography sx={{ color: '#ffd700', fontWeight: 'bold' }}>
                {event.dkp_value} DKP
              </Typography>
            </Box>
          )}
        </Grid>
  
        <Grid item xs={12} md={6}>
          <Box mb={3}>
            <Typography variant="h6" mb={2}>Roles Summary</Typography>
            <Grid container spacing={2} direction="column">
              <Grid item container spacing={1}>
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
                <Grid item>
                  <Chip 
                    label={`Absent: ${event.absentees?.length || 0}`}
                    color="default"
                    sx={{
                      bgcolor: '#555',
                      '&:hover': {
                        bgcolor: '#666'
                      }
                    }}
                  />
                </Grid>
              </Grid>
              
              {/* New Sign Up with Primary Build Button */}
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={signUpWithPrimaryBuild}
                  startIcon={<PersonAddIcon />}
                  sx={{ mb: 1 }}
                >
                  Sign Up with Primary Build
                </Button>
              </Grid>
              
              {/* New Mark as Absent Button */}
              <Grid item>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={markAsAbsent}
                  startIcon={<DoNotDisturbIcon />}
                >
                  Mark as Absent
                </Button>
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
            eventTime: event.event_time,
            dkpValue: event.dkp_value
          }}
          onSubmit={async (updatedData) => {
            try {
              const response = await fetch(`${API_URL}/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  ...updatedData,
                  event_time: updatedData.eventTime,
                  dkp_value: updatedData.dkpValue,
                  guildId: guildId
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
  
      {/* Delete event button */}
      <DialogActions>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteEvent}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Event'}
        </Button>
      </DialogActions>
    </DialogContent>
  );
};

export default EventDetails;