// EventPlanner/EventPlanner.jsx
import { useState, useEffect } from 'react';
import { 
  Box, 
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Button,
  Dialog
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarView from './CalendarView';
import ListView from './ListView';
import EventForm from './EventForm';

const EventPlanner = () => {
  const [viewMode, setViewMode] = useState('calendar');
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/events', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          Event Planner
        </Typography>
        <Box display="flex" gap={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newValue) => newValue && setViewMode(newValue)}
            sx={{ 
              bgcolor: '#1e1e1e',
              '& .MuiToggleButton-root': {
                color: 'grey.400',
                '&.Mui-selected': {
                  color: 'white',
                  bgcolor: 'rgba(144, 202, 249, 0.2)'
                }
              }
            }}
          >
            <ToggleButton value="calendar">
              <CalendarMonthIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button 
            variant="contained" 
            onClick={() => {
              setSelectedEvent(null);
              setIsFormOpen(true);
            }}
            sx={{ 
              bgcolor: '#90caf9',
              '&:hover': { bgcolor: '#64b5f6' }
            }}
          >
            Create Event
          </Button>
        </Box>
      </Box>

      {viewMode === 'calendar' ? (
        <CalendarView 
          events={events}
          onEventSelect={setSelectedEvent}
          onEventUpdate={fetchEvents}
        />
      ) : (
        <ListView 
          events={events}
          onEventSelect={setSelectedEvent}
          onEventUpdate={fetchEvents}
        />
      )}

      <Dialog 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1e1e1e' }
        }}
      >
        <EventForm 
          initialData={selectedEvent}
          onSubmit={async (eventData) => {
            try {
              const url = selectedEvent 
                ? `http://localhost:5000/api/events/${selectedEvent.id}`
                : 'http://localhost:5000/api/events';
              
              const response = await fetch(url, {
                method: selectedEvent ? 'PUT' : 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(eventData)
              });

              if (!response.ok) {
                throw new Error('Failed to save event');
              }

              await fetchEvents();
              setIsFormOpen(false);
            } catch (error) {
              console.error('Error saving event:', error);
            }
          }}
          onClose={() => setIsFormOpen(false)}
        />
      </Dialog>

      <Dialog 
        open={Boolean(selectedEvent)} 
        onClose={() => setSelectedEvent(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#1e1e1e' }
        }}
      >
        {selectedEvent && (
          <EventForm 
            initialData={selectedEvent}
            onSubmit={async (eventData) => {
              try {
                const response = await fetch(`http://localhost:5000/api/events/${selectedEvent.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify(eventData)
                });

                if (!response.ok) {
                  throw new Error('Failed to update event');
                }

                await fetchEvents();
                setSelectedEvent(null);
              } catch (error) {
                console.error('Error updating event:', error);
              }
            }}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </Dialog>
    </Box>
  );
};

export default EventPlanner;