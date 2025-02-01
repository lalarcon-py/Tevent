// components/LootManagement/EventsCalendar.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axiosInstance from '../../config/axios';

const localizer = momentLocalizer(moment);

const EventsCalendar = () => {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [signupRole, setSignupRole] = useState('dps');
  const [selectedDate, setSelectedDate] = useState(null);
  
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get('/api/events');
      setEvents(response.data.map(event => ({
        ...event,
        start: new Date(event.date),
        end: new Date(event.date),
        title: event.name
      })));
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setOpenDialog(true);
  };

  const handleSignup = async () => {
    try {
      await axiosInstance.post('/api/event-signup', {
        eventId: selectedEvent.id,
        role: signupRole
      });
      setOpenDialog(false);
      fetchEvents();
    } catch (error) {
      console.error('Failed to sign up:', error);
    }
  };

  return (
    <Box>
      <Paper sx={{
        p: 4,
        height: 600,
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleEventClick}
          style={{ height: '100%' }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{selectedEvent?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography>
              Date: {selectedEvent && moment(selectedEvent.date).format('MMMM Do YYYY, h:mm a')}
            </Typography>
            <Typography>
              DKP Value: {selectedEvent?.dkpValue}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value)}
              >
                <MenuItem value="tank">Tank</MenuItem>
                <MenuItem value="healer">Healer</MenuItem>
                <MenuItem value="dps">DPS</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSignup} variant="contained">
            Sign Up
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventsCalendar;