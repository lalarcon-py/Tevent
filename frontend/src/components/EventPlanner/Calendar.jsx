// components/EventPlanner/Calendar.jsx
import { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Calendar = ({ events, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

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
      days.push(
        <Grid item xs key={`empty-${i}`}>
          <Paper 
            sx={{ 
              aspectRatio: '1/1',
              bgcolor: 'transparent',
              boxShadow: 'none'
            }} 
          />
        </Grid>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getDayEvents(day);
      const isToday = new Date().getDate() === day && 
                      new Date().getMonth() === currentDate.getMonth() &&
                      new Date().getFullYear() === currentDate.getFullYear();

      days.push(
        <Grid item xs key={day}>
          <Paper 
            elevation={0}
            sx={{
              height: '100%',
              p: isMobile ? 0.75 : 1.5,
              bgcolor: isToday ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
              border: '1px solid',
              borderColor: isToday ? '#90caf9' : 'rgba(255, 255, 255, 0.12)',
              borderRadius: 2,
              minHeight: isMobile ? '80px' : '120px',
              aspectRatio: '1/1',
              position: 'relative',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'rgba(144, 202, 249, 0.04)',
                transform: 'scale(1.02)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }
            }}
          >
            <Typography 
              sx={{ 
                color: isToday ? '#90caf9' : 'white',
                fontWeight: isToday ? 600 : 400,
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                mb: isMobile ? 0.5 : 1
              }}
            >
              {day}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {dayEvents.map(event => (
                <Box
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  sx={{
                    bgcolor: 'rgba(144, 202, 249, 0.15)',
                    color: '#90caf9',
                    p: isMobile ? 0.5 : 0.75,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease-in-out',
                    border: '1px solid rgba(144, 202, 249, 0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(144, 202, 249, 0.25)',
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  {event.title}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      );
    }

    return days;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Use shortened day names for mobile
  const mobileWeekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Box sx={{ 
      p: isMobile ? 1 : 3, 
      borderRadius: 4, 
      bgcolor: '#121212',
      overflowX: 'hidden' 
    }}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={isMobile ? 2 : 4}
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          pb: isMobile ? 1 : 2
        }}
      >
        <IconButton 
          onClick={() => navigateMonth(-1)} 
          sx={{ 
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.08)'
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography 
          variant={isMobile ? "subtitle1" : "h5"} 
          sx={{ 
            color: 'white',
            fontWeight: 500,
            letterSpacing: 0.5
          }}
        >
          {currentDate.toLocaleString('default', { 
            month: 'long', 
            year: isMobile ? '2-digit' : 'numeric' 
          })}
        </Typography>
        <IconButton 
          onClick={() => navigateMonth(1)} 
          sx={{ 
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.08)'
            }
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      <Grid container spacing={isMobile ? 1 : 2}>
        {(isMobile ? mobileWeekDays : weekDays).map(day => (
          <Grid item xs key={day}>
            <Typography 
              align="center" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 500,
                mb: isMobile ? 1 : 2,
                textTransform: 'uppercase',
                letterSpacing: 0.5
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