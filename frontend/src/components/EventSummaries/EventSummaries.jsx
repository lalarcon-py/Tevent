// src/components/EventSummaries/EventSummaries.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { format, parseISO, isPast } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';

const API_URL = process.env.REACT_APP_API_URL;

// BuildSelectionDialog component definition
const BuildSelectionDialog = ({ open, builds, onClose, onSelectBuild }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
        Select Build for Event
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
        <Typography color="white" sx={{ mb: 2 }}>
          Please select which build you want to use for this event:
        </Typography>
        <List>
          {builds.map((build, index) => {
            // Generate URLs directly from the public folder
            const primaryImageUrl = build.primary ? `/weapons/${build.primary} Art.png` : null;
            const secondaryImageUrl = build.secondary ? `/weapons/${build.secondary} Art.png` : null;
            
            return (
              <ListItem
                key={index}
                button
                onClick={() => onSelectBuild(build)}
                sx={{
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                  {build.primary && (
                    <img
                      src={primaryImageUrl}
                      alt={build.primary}
                      style={{ width: 24, height: 24 }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  {build.secondary && (
                    <img
                      src={secondaryImageUrl}
                      alt={build.secondary}
                      style={{ width: 24, height: 24 }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </Box>
                <ListItemText
                  primary={
                    <Typography color="white">
                      {build.primary} + {build.secondary}
                    </Typography>
                  }
                  secondary={
                    <Typography color={
                      build.spec === 'Tank' ? '#66b3ff' :
                      build.spec === 'Healer' ? '#66ff66' : '#ff6666'
                    }>
                      {build.spec}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'white' }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EventSummaries = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState(null);
  const { user: currentUser } = useAuth();
  const { simulatedRole } = useSimulatedRole();
  
  // New state variables for build selection
  const [buildSelectionOpen, setBuildSelectionOpen] = useState(false);
  const [userBuilds, setUserBuilds] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  // Get effective role
  const effectiveRole = simulatedRole || (currentUser ? currentUser.role : null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Get guild ID from localStorage
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        throw new Error('Guild ID not found. Please select a guild first.');
      }
      
      const response = await fetch(`${API_URL}/api/events?guildId=${guildId}`, {
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
      
      // Set events first
      setEvents(upcomingEvents);
      
      // Then fetch absentees for each event
      for (const event of upcomingEvents) {
        try {
          const absentResponse = await fetch(`${API_URL}/api/events/${event.id}/absentees?guildId=${guildId}`, {
            credentials: 'include'
          });
          
          if (absentResponse.ok) {
            const absentData = await absentResponse.json();
            // Update that specific event with absentee data
            setEvents(prevEvents => 
              prevEvents.map(e => 
                e.id === event.id ? {...e, absentees: absentData} : e
              )
            );
          }
        } catch (err) {
          console.error(`Error fetching absentees for event ${event.id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithPrimaryBuild = async (eventId) => {
    try {
      setLoading(true);
      
      // Get the event from the events array
      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error("Event not found");
      }
      
      // Get current user data to determine primary build
      const userResponse = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // Check if user is already signed up for this event
      const isAlreadySignedUp = event.participants && 
                              event.participants.some(p => p.User?.id === userData.id);
      
      if (isAlreadySignedUp) {
        setSuccessMessage("You're already signed up for this event");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoading(false);
        return;
      }
      
      // Check if user has builds
      if (!userData.builds || userData.builds.length === 0) {
        throw new Error("No primary build found. Please set up your builds first.");
      }
      
      // If user has multiple builds, show the selection dialog
      if (userData.builds.length > 1) {
        console.log('User has multiple builds, opening selection dialog');
        setUserBuilds(userData.builds);
        setSelectedEventId(eventId);
        setBuildSelectionOpen(true);
        setLoading(false);
        return;
      }
      
      // Get the primary build
      const primaryBuild = userData.builds[0];
      
      // Determine role based on spec
      let role;
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // Send the signup request
      const response = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          guildId: localStorage.getItem('guildId')
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up');
      }
      
      // Refresh the events data
      await fetchEvents();
      
      // Show success message
      setSuccessMessage(`Successfully signed up as ${role} for the event`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Error signing up:', error);
      setError(error.message || 'Failed to sign up for event');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (userId, eventId) => {
    try {
      const response = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId,
          guildId: localStorage.getItem('guildId')
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participant');
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  };

  const markAsAbsent = async (eventId) => {
    try {
      setLoading(true);
      
      // Ensure eventId is a string
      const eventIdString = typeof eventId === 'object' ? eventId.id : eventId;
      
      if (!eventIdString) {
        throw new Error('Invalid event ID');
      }
      
      console.log('Marking absence for event ID:', eventIdString);
      
      // Get current user data
      const userResponse = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // Get guild ID
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        throw new Error('Guild ID not found');
      }
      
      // Check if user has builds
      if (!userData.builds || userData.builds.length === 0) {
        throw new Error("Could not find your primary build. Please set up your builds first.");
      }
      
      // Determine role based on build spec
      let role;
      const primaryBuild = userData.builds[0];
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // First, remove existing participation if any
      try {
        const deleteResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: userData.id,
            guildId: guildId
          })
        });
      } catch (error) {
        console.warn('Error removing existing participation:', error);
        // Continue anyway - they might not be signed up yet
      }
      
      // Sign up with the role
      const signupResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          guildId: guildId
        })
      });
      
      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        console.error('Signup response error:', errorData);
        throw new Error(errorData.error || 'Failed to process signup');
      }
      
      // Then immediately delete to mark as absent
      const absentResponse = await fetch(`${API_URL}/api/events/${eventIdString}/signup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userId: userData.id,
          guildId: guildId,
          markAsAbsent: true  // Add this flag
        })
      });
      
      if (!absentResponse.ok) {
        const errorData = await absentResponse.json();
        throw new Error(errorData.error || 'Failed to mark as absent');
      }
      
      // Refresh events data
      await fetchEvents();
      
      setSuccessMessage("You've been marked as absent for this event");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error marking as absent:', error);
      setError(error.message || 'Failed to mark as absent');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTeamPlanner = (eventId) => {
    navigate(`/events/${eventId}/team-planner`);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'white', mb: 1 }}>
          Upcoming Events
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {events.length} events scheduled
        </Typography>
      </Box>
      
      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : events.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: '#1e1e1e', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary">
            No upcoming events
          </Typography>
          {/* Only show Create Event button if user has permission */}
          {['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole) && (
            <Button 
              variant="contained" 
              onClick={() => navigate('/event-planner')}
              sx={{ mt: 2 }}
            >
              Create an Event
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {events.map(event => {
            // Calculate participation statistics
            const totalParticipants = event.participants?.length || 0;
            const tankCount = event.participants?.filter(p => p.role === 'TANK').length || 0;
            const healerCount = event.participants?.filter(p => p.role === 'HEALER').length || 0;
            const dpsCount = event.participants?.filter(p => p.role === 'DPS').length || 0;
            const absentCount = event.absentees?.length || 0;
            
            // Calculate percentage filled
            const tankPercentage = Math.round((tankCount / event.tanks) * 100);
            const healerPercentage = Math.round((healerCount / event.healers) * 100);
            const dpsPercentage = Math.round((dpsCount / event.dps) * 100);
            const totalSpots = event.tanks + event.healers + event.dps;
            const totalPercentage = Math.round((totalParticipants / totalSpots) * 100);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={event.id}>
                <Card sx={{ 
                  height: '100%',
                  bgcolor: '#1e1e1e',
                  borderRadius: 2,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 20px rgba(0, 0, 0, 0.2)'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="div" sx={{ 
                      color: 'white', 
                      mb: 2,
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      pb: 1 
                    }}>
                      {event.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalendarTodayIcon sx={{ color: '#90caf9', mr: 1 }} />
                      <Typography color="text.secondary">
                        {format(parseISO(event.event_time), 'EEE, MMM dd, yyyy HH:mm')}
                      </Typography>
                    </Box>
                    
                    {event.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <LocationOnIcon sx={{ color: '#90caf9', mr: 1 }} />
                        <Typography color="text.secondary">
                          {event.location}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <GroupIcon sx={{ color: '#90caf9', mr: 1 }} />
                      <Typography color="text.secondary">
                        {totalParticipants} / {totalSpots} participants ({totalPercentage}% filled)
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 1 
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#2196f3' }}>
                          Tanks
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tankCount}/{event.tanks} ({tankPercentage}%)
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        height: 6, 
                        bgcolor: 'rgba(33, 150, 243, 0.2)', 
                        borderRadius: 3, 
                        mb: 2,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{ 
                          height: '100%', 
                          width: `${tankPercentage}%`, 
                          bgcolor: '#2196f3',
                          borderRadius: 3
                        }} />
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 1 
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#4caf50' }}>
                          Healers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {healerCount}/{event.healers} ({healerPercentage}%)
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        height: 6, 
                        bgcolor: 'rgba(76, 175, 80, 0.2)', 
                        borderRadius: 3, 
                        mb: 2,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{ 
                          height: '100%', 
                          width: `${healerPercentage}%`, 
                          bgcolor: '#4caf50',
                          borderRadius: 3
                        }} />
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 1 
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#f44336' }}>
                          DPS
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dpsCount}/{event.dps} ({dpsPercentage}%)
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        height: 6, 
                        bgcolor: 'rgba(244, 67, 54, 0.2)', 
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{ 
                          height: '100%', 
                          width: `${dpsPercentage}%`, 
                          bgcolor: '#f44336',
                          borderRadius: 3
                        }} />
                      </Box>

                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mt: 2
                      }}>
                        <Typography variant="subtitle2" sx={{ color: '#aaa' }}>
                          Absents
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {absentCount}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {event.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        mt: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        height: '40px'
                      }}>
                        {event.description}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
                  
                  <CardActions sx={{ p: 2, flexDirection: 'column', alignItems: 'stretch' }}>
                    <Button 
                      variant="contained" 
                      fullWidth
                      onClick={() => signUpWithPrimaryBuild(event.id)}
                      startIcon={<PersonAddIcon />}
                      sx={{
                        bgcolor: '#90caf9',
                        color: '#212121',
                        fontWeight: 500,
                        mb: 1,
                        '&:hover': {
                          bgcolor: '#64b5f6'
                        }
                      }}
                    >
                      Sign Up with Primary Build
                    </Button>
                    
                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                      <Button 
                        variant="outlined"
                        color="error"
                        startIcon={<DoNotDisturbIcon />}
                        onClick={() => markAsAbsent(event.id)}
                        sx={{ flex: 1 }}
                      >
                        Mark as Absent
                      </Button>
                      
                      <Button 
                        variant="outlined"
                        onClick={() => navigateToTeamPlanner(event.id)}
                        sx={{ flex: 1 }}
                      >
                        View Teams
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
      
      {/* Build Selection Dialog */}
      <BuildSelectionDialog
        open={buildSelectionOpen}
        builds={userBuilds}
        onClose={() => setBuildSelectionOpen(false)}
        onSelectBuild={async (selectedBuild) => {
          // Determine role based on the selected build's spec
          let role;
          if (selectedBuild.spec === 'Tank') {
            role = 'TANK';
          } else if (selectedBuild.spec === 'Healer') {
            role = 'HEALER';
          } else {
            role = 'DPS';
          }
          
          try {
            setLoading(true);
            
            // Send the signup request
            const response = await fetch(`${API_URL}/api/events/${selectedEventId}/signup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ 
                role,
                selectedBuild,
                guildId: localStorage.getItem('guildId')
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to sign up');
            }
            
            // Refresh the events data
            await fetchEvents();
            
            // Show success message
            setSuccessMessage(`Successfully signed up as ${role} using ${selectedBuild.primary}+${selectedBuild.secondary}`);
            setTimeout(() => setSuccessMessage(null), 3000);
          } catch (error) {
            console.error('Error signing up with selected build:', error);
            setError(error.message || 'Failed to sign up for event');
          } finally {
            setLoading(false);
          }
          
          setBuildSelectionOpen(false);
        }}
      />
    </Box>
  );
};

export default EventSummaries;