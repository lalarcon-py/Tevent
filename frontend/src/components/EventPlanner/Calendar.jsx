// components/EventPlanner/Calendar.jsx
import { useState } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper,
  IconButton 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Calendar = ({ events, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDayEvents = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.eventTime);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<Grid item xs key={`empty-${i}`} sx={{ aspectRatio: '1/1' }} />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getDayEvents(day);
      days.push(
        <Grid item xs key={day}>
          <Paper 
            sx={{
              height: '100%',
              p: 1,
              bgcolor: '#1e1e1e',
              borderRadius: 1,
              minHeight: '100px',
              aspectRatio: '1/1',
              position: 'relative',
              '&:hover': {
                bgcolor: 'rgba(144, 202, 249, 0.1)',
              }
            }}
          >
            <Typography sx={{ color: 'white' }}>{day}</Typography>
            {dayEvents.map(event => (
              <Box
                key={event.id}
                onClick={() => onEventClick(event)}
                sx={{
                  bgcolor: '#90caf9',
                  color: 'black',
                  p: 0.5,
                  borderRadius: 1,
                  mb: 0.5,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {event.title}
              </Box>
            ))}
          </Paper>
        </Grid>
      );
    }

    return days;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <IconButton onClick={() => navigateMonth(-1)} sx={{ color: 'white' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ color: 'white' }}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton onClick={() => navigateMonth(1)} sx={{ color: 'white' }}>
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      <Grid container spacing={1}>
        {weekDays.map(day => (
          <Grid item xs key={day}>
            <Typography 
              align="center" 
              sx={{ 
                color: 'white',
                fontWeight: 'bold',
                mb: 1
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
        {renderCalendarDays()}
      </Grid>
    </Box>
  );
};

export default Calendar;