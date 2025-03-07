// EventPlanner/CalendarView.jsx
import { useState, useMemo } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  IconButton,
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const CalendarView = ({ events, onEventClick, onSignUp, onMarkAbsent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDayEvents = useMemo(() => {
    const eventsByDay = {};
    events.forEach(event => {
      const eventDate = new Date(event.event_time);
      if (
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      ) {
        const day = eventDate.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(event);
      }
    });
    return eventsByDay;
  }, [events, currentDate]);

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const CalendarDay = ({ day, isEmptyCell = false }) => {
    if (isEmptyCell) return null;

    const dayEvents = getDayEvents[day] || [];
    const hasEvents = dayEvents.length > 0;
    const isToday = new Date().getDate() === day && 
                    new Date().getMonth() === currentDate.getMonth() &&
                    new Date().getFullYear() === currentDate.getFullYear();

    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    const handleClick = () => {
      if (hasEvents) {
        onEventClick(dayEvents[0]);
      } else {
        const defaultEventTime = new Date(dayDate.setHours(12, 0, 0, 0));
        onEventClick({ event_time: defaultEventTime.toISOString() });
      }
    };

    return (
      <Box
        onClick={handleClick}
        sx={{
          height: '120px',
          width: '100%',
          p: 2,
          position: 'relative',
          cursor: 'pointer',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          bgcolor: 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 0 0 2px #90caf9',
            zIndex: 1,
            '& .day-number': {
              color: '#90caf9',
            }
          }
        }}
      >
        <Typography 
          className="day-number"
          sx={{ 
            color: isToday ? '#90caf9' : 'rgba(255, 255, 255, 0.87)',
            fontSize: '1.1rem',
            fontWeight: isToday ? 500 : 400,
            transition: 'color 0.2s ease',
          }}
        >
          {day}
        </Typography>
        
        {hasEvents && (
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              p: '4px'
            }}
          >
            {dayEvents.map((event) => (
              <Box
                key={event.id}
                sx={{
                  width: '4px',
                  flexGrow: 1,
                  bgcolor: event.color || '#ff4444',
                  borderRadius: '2px',
                  transition: 'width 0.2s ease',
                  '.MuiBox-root:hover &': {
                    width: '6px'
                  }
                }}
              />
            ))}
          </Box>
        )}
    
        {hasEvents && (
          <>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                mt: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                transition: 'color 0.2s ease',
                '.MuiBox-root:hover &': {
                  color: 'rgba(255, 255, 255, 0.87)'
                }
              }}
            >
              {dayEvents[0].title}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: '4px', mt: 1, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onSignUp) {
                    console.log("Sign up clicked for event:", dayEvents[0].id);
                    onSignUp(dayEvents[0].id);
                  }
                }}
                sx={{
                  fontSize: '0.75rem',
                  padding: '1px 4px',
                  color: '#90caf9',
                  borderColor: '#90caf9',
                  minWidth: 0,
                  height: '20px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(144, 202, 249, 0.1)',
                    borderColor: '#90caf9'
                  }
                }}
              >
                Sign Up
              </Button>
              <Button
                variant="outlined"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onMarkAbsent) {
                    console.log("Absent clicked for event:", dayEvents[0].id);
                    onMarkAbsent(dayEvents[0].id);
                  }
                }}
                sx={{
                  fontSize: '0.75rem',
                  padding: '1px 4px',
                  color: '#f44336',
                  borderColor: '#f44336',
                  minWidth: 0,
                  height: '20px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    borderColor: '#f44336'
                  }
                }}
              >
                Absent
              </Button>
            </Box>
          </>
        )}
      </Box>
    );
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box sx={{ 
      width: '100%',
      bgcolor: '#121212',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <Box 
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <IconButton 
          onClick={() => navigateMonth(-1)} 
          sx={{ color: 'white' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 500 }}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton 
          onClick={() => navigateMonth(1)} 
          sx={{ color: 'white' }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Grid container>
          {weekDays.map(day => (
            <Grid 
              item 
              key={day} 
              sx={{ 
                width: `${100/7}%`,
                borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                p: 1
              }}
            >
              <Typography sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'center'
              }}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Grid container>
          {[...Array(getFirstDayOfMonth(currentDate))].map((_, index) => (
            <Grid 
              item 
              key={`empty-${index}`} 
              sx={{ width: `${100/7}%` }}
            >
              <CalendarDay isEmptyCell />
            </Grid>
          ))}
          {[...Array(getDaysInMonth(currentDate))].map((_, index) => (
            <Grid 
              item 
              key={index} 
              sx={{ width: `${100/7}%` }}
            >
              <CalendarDay day={index + 1} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default CalendarView;