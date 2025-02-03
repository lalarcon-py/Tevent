// EventPlanner/EventPlanner.jsx
import { useState, useEffect } from 'react';
import { Box, Button, Dialog, Snackbar, Alert, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarView from './CalendarView';
import EventForm from './EventForm';
import EventDetails from './EventDetails';

const EventPlanner = () => {
  const [events, setEvents] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/status', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          console.log('Authenticated as:', userData);
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

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/events', {
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

    try {
      console.log('Creating event as user:', user);
      console.log('Attempting to create event with data:', eventData);

      const response = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...eventData,
          event_time: eventData.eventTime
        })
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

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
      // Existing event clicked
      setSelectedEvent(eventData);
      setIsDetailsDialogOpen(true);
    } else {
      // Empty date clicked - open create dialog with pre-filled date
      setIsCreateDialogOpen(true);
      setSelectedEvent({
        event_time: eventData.event_time,
        title: '',
        description: '',
        location: '',
        tanks: 2,
        healers: 4,
        dps: 24,
        requirements: ''
      });
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
            href="http://localhost:5000/auth/discord" 
            sx={{ mt: 2 }}
          >
            Login with Discord
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
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
          </Box>

          <CalendarView 
            events={events} 
            onEventClick={handleEventClick}
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