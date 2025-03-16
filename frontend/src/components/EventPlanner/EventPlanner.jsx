// EventPlanner/EventPlanner.jsx
import { useState, useEffect } from 'react';
import { Box, Button, Dialog, Snackbar, Alert, Typography, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarView from './CalendarView';
import EventForm from './EventForm';
import EventDetails from './EventDetails';

const API_URL = process.env.REACT_APP_API_URL;

const EventPlanner = () => {
  const [events, setEvents] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [guildId, setGuildId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          console.log('Not authenticated');
          setError('Please log in to create events');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUserGuild = async () => {
        try {
          const response = await fetch(`${API_URL}/api/guilds/my-guilds`, {
            credentials: 'include'
          });
          if (response.ok) {
            const guilds = await response.json();
            if (guilds.length > 0) {
              setGuildId(guilds[0].id);
            }
          }
        } catch (error) {
          console.error('Error fetching user guilds:', error);
        }
      };
      
      fetchUserGuild();
    }
  }, [user]);

  // Add permission check helper function
  const hasEventCreationPermission = () => {
    if (!user) return false;
    return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(user.role);
  };

  const fetchEvents = async () => {
    try {
      const url = guildId 
        ? `${API_URL}/api/events?guildId=${guildId}`
        : `${API_URL}/api/events`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to fetch events');
    }
  };

  const createEvent = async (eventData) => {
    if (!user) {
      throw new Error('Please log in to create events');
    }
  
    // Add permission check
    if (!hasEventCreationPermission()) {
      throw new Error('You do not have permission to create events');
    }
  
    try {
      console.log('Creating event as user:', user);
      
      const requestData = {
        ...eventData,
        event_time: eventData.eventTime,
        guildId: guildId // Include guild ID
      }; 
  
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create event');
      }
  
      await fetchEvents();
      return responseData;
    } catch (error) {
      console.error('Create event error:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleEventClick = (eventData) => {
    if (eventData.id) {
      setSelectedEvent(eventData);
      setIsDetailsDialogOpen(true);
    } else if (hasEventCreationPermission()) {
      // Only show create dialog if user has permission
      setIsCreateDialogOpen(true);
      setSelectedEvent({
        event_time: eventData.event_time,
        title: '',
        description: '',
        location: '',
        tanks: 15,
        healers: 20,
        dps: 35,
        requirements: ''
      });
    } else {
      setError('You do not have permission to create events');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    // Check permissions before delete
    if (!hasEventCreationPermission()) {
      setError('You do not have permission to delete events');
      return;
    }
  
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setIsDeleting(true);
  
    try {
      const response = await fetch(
        `${API_URL}/api/events/${selectedEvent.id}?guildId=${guildId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      setEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      setIsDetailsDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignUp = async (eventId) => {
    try {
      // Find the event in our events array
      const event = events.find(e => e.id === eventId);
      if (!event) {
        setError("Event not found");
        return;
      }
      
      // Get user data to determine primary build
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
      
      // Determine role based on the build's spec
      let role;
      const primaryBuild = userData.builds[0];
      if (primaryBuild.spec === 'Tank') {
        role = 'TANK';
      } else if (primaryBuild.spec === 'Healer') {
        role = 'HEALER';
      } else {
        role = 'DPS';
      }
      
      // Sign up for the event
      const response = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role,
          guildId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign up');
      }
      
      // Refresh events data
      await fetchEvents();
      
    } catch (error) {
      console.error('Error signing up for event:', error);
      setError(error.message || 'Failed to sign up for event');
    }
  };

  const handleMarkAbsent = async (eventId) => {
    try {
      // Find the event
      const event = events.find(e => e.id === eventId);
      if (!event) {
        setError("Event not found");
        return;
      }
  
      // Get current user data 
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
        // If already signed up, remove them from the event
        const response = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: userData.id,
            guildId
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to mark as absent');
        }
      } else {
        // If not signed up, we need to sign up first with a valid role
        // Check if user has builds
        if (!userData.builds || userData.builds.length === 0) {
          setError("Could not find your primary build. Please set up your builds first.");
          return;
        }
        
        // Determine role based on the build's spec
        let role;
        const primaryBuild = userData.builds[0];
        if (primaryBuild.spec === 'Tank') {
          role = 'TANK';
        } else if (primaryBuild.spec === 'Healer') {
          role = 'HEALER';
        } else {
          role = 'DPS';
        }
        
        // Sign up with a valid role
        const signupResponse = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            role,
            guildId
          })
        });
        
        if (!signupResponse.ok) {
          const errorData = await signupResponse.json();
          throw new Error(errorData.error || 'Failed to sign up for event');
        }
        
        // Then immediately remove them (this marks them as "absent")
        const deleteResponse = await fetch(`${API_URL}/api/events/${eventId}/signup`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: userData.id,
            guildId
          })
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          throw new Error(errorData.error || 'Failed to mark as absent');
        }
      }
      
      // Refresh events data
      await fetchEvents();
      
    } catch (error) {
      console.error('Error marking as absent:', error);
      setError(error.message || 'Failed to mark as absent');
    }
  };

  return (
    <Box>
      {!user ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="error">
            Please log in to access the Event Planner
          </Typography>
          <Button 
            variant="contained" 
            href={`${API_URL}/auth/discord`}
            sx={{ mt: 2 }}
          >
            Login with Discord
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            {hasEventCreationPermission() ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedEvent(null);
                  setIsCreateDialogOpen(true);
                }}
                sx={{ bgcolor: '#90caf9', '&:hover': { bgcolor: '#64b5f6' } }}
              >
                Create Event
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Only Guild Master, Guild Advisor, and Guild Guardian can create events
              </Typography>
            )}
          </Box>

          <CalendarView 
            events={events} 
            onEventClick={handleEventClick}
            onSignUp={handleSignUp}
            onMarkAbsent={handleMarkAbsent}
          />

          <Dialog 
            open={isCreateDialogOpen} 
            onClose={() => {
              setIsCreateDialogOpen(false);
              setSelectedEvent(null);
            }}
            maxWidth="md"
            fullWidth
          >
            <EventForm 
              initialData={selectedEvent || {
                title: '',
                description: '',
                eventTime: new Date().toISOString().slice(0, 16),
                location: '',
                tanks: 2,
                healers: 4,
                dps: 24,
                requirements: ''
              }}
              onSubmit={async (eventData) => {
                try {
                  await createEvent(eventData);
                  setIsCreateDialogOpen(false);
                  setSelectedEvent(null);
                } catch (error) {
                  console.error('Error in form submission:', error);
                  setError(error.message || 'Failed to create event');
                }
              }}
              onClose={() => {
                setIsCreateDialogOpen(false);
                setSelectedEvent(null);
              }}
            />
          </Dialog>

          <Dialog
              open={isDetailsDialogOpen}
              onClose={() => {
                setIsDetailsDialogOpen(false);
                setSelectedEvent(null);
              }}
              maxWidth="md"
              fullWidth
            >
              {selectedEvent && (
                <>
                  <EventDetails 
                    event={selectedEvent}
                    onEventUpdate={async () => {
                      await fetchEvents();
                      setIsDetailsDialogOpen(false);
                      setSelectedEvent(null);
                    }}
                    onClose={() => {
                      setIsDetailsDialogOpen(false);
                      setSelectedEvent(null);
                    }}
                  />
                  {/* Add Delete Button with permission check */}
                  {hasEventCreationPermission() && (
                    <DialogActions>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteEvent}
                        sx={{ ml: 2 }}
                      >
                        Delete Event
                      </Button>
                    </DialogActions>
                  )}
                </>
              )}
            </Dialog>
        </>
      )}

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventPlanner;