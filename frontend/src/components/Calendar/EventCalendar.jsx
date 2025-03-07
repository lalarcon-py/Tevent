// frontend/src/components/Calendar/EventCalendar.jsx
import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { 
  Paper,
  Box,
  Button,
  Typography
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';

const localizer = momentLocalizer(moment);

const EventCalendar = ({ events, onSignUp, onMarkAbsent }) => {
  // Custom event component with signup buttons
  const EventComponent = ({ event }) => {
    const handleSignUp = (e) => {
      e.stopPropagation();
      if (onSignUp) onSignUp(event.id);
    };
    
    const handleAbsent = (e) => {
      e.stopPropagation();
      if (onMarkAbsent) onMarkAbsent(event.id);
    };
    
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          {event.title}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', gap: 0.5, flexWrap: 'wrap', fontSize: '10px' }}>
          <Button 
            variant="text" 
            size="small"
            startIcon={<PersonAddIcon sx={{ fontSize: '0.8rem' }} />}
            onClick={handleSignUp}
            sx={{ 
              minWidth: 'auto', 
              padding: '1px 4px',
              fontSize: '9px',
              lineHeight: 1,
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' }
            }}
          >
            Sign Up
          </Button>
          <Button 
            variant="text" 
            size="small"
            startIcon={<DoNotDisturbIcon sx={{ fontSize: '0.8rem' }} />}
            onClick={handleAbsent}
            sx={{ 
              minWidth: 'auto', 
              padding: '1px 4px',
              fontSize: '9px',
              lineHeight: 1,
              backgroundColor: 'rgba(255,0,0,0.15)',
              color: '#fff',
              '&:hover': { backgroundColor: 'rgba(255,0,0,0.25)' }
            }}
          >
            Absent
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 4, height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        components={{
          event: EventComponent // Use our custom event component
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.type === 'raid' ? '#f48fb1' : '#90caf9',
          }
        })}
      />
    </Paper>
  );
};

export default EventCalendar;