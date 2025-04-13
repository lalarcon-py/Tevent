// EventPlanner/CalendarView.jsx
import { useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  IconButton,
  Button,
  useMediaQuery,
  useTheme,
  SwipeableDrawer
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const CalendarView = ({ events, onEventClick, onSignUp, onMarkAbsent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [selectedDate, setSelectedDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  
  // Helper function to format a time in a specific timezone
  const formatTimeInTimezone = (dateString, timezone) => {
    try {
      const date = new Date(dateString);
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone || 'UTC'
      };
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
      console.error('Error formatting time with timezone:', error);
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  // Helper function to format timezone name nicely
  const formatTimezoneName = (timezone) => {
    if (!timezone) return 'UTC';
    try {
      // Extract the location part after the '/' if it exists
      const parts = timezone.split('/');
      if (parts.length > 1) {
        // Replace underscores with spaces and capitalize words
        return parts[1].replace(/_/g, ' ').replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
      }
      return timezone;
    } catch (error) {
      return timezone;
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Helper function to display a date according to its timezone
  const getAdjustedDate = (dateString, timezone) => {
    try {
      // Create a date object from the ISO string (it's in UTC)
      const utcDate = new Date(dateString);
      
      if (!timezone) {
        return utcDate; // Default to UTC if no timezone specified
      }
      
      // For display and calendar positioning purposes, we need to understand what day/month/year
      // this event falls on in the specified timezone
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      };
      
      // Get the date components in the target timezone
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(utcDate);
      
      // Extract parts
      const year = parseInt(parts.find(p => p.type === 'year').value);
      const month = parseInt(parts.find(p => p.type === 'month').value) - 1; // JS months are 0-indexed
      const day = parseInt(parts.find(p => p.type === 'day').value);
      const hour = parseInt(parts.find(p => p.type === 'hour').value);
      const minute = parseInt(parts.find(p => p.type === 'minute').value);
      
      // Create a new date object that would have the same display in the local timezone
      // as the original UTC date would have in the specified timezone
      const localEquivalent = new Date(year, month, day, hour, minute);
      
      return localEquivalent;
    } catch (error) {
      console.error('Error adjusting date for timezone:', error);
      return new Date(dateString);
    }
  };

  const getDayEvents = useMemo(() => {
    const eventsByDay = {};
    events.forEach(event => {
      // Use timezone-adjusted date
      const eventDate = getAdjustedDate(event.event_time, event.timezone);
      
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

  // Handle mobile day selection
  const handleDayClick = (day) => {
    if (isMobile) {
      const dayEvents = getDayEvents[day] || [];
      setSelectedDayEvents(dayEvents);
      setSelectedDate(day);
      setDrawerOpen(true);
    }
  };

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
      if (isMobile) {
        handleDayClick(day);
      } else if (hasEvents) {
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
          height: isMobile ? '80px' : '120px',
          width: '100%',
          p: isMobile ? 1 : 2,
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
            fontSize: isMobile ? '0.9rem' : '1.1rem',
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
    
        {hasEvents && !isMobile && (
          <>
            <Box>
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  mt: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
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
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.75rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  transition: 'color 0.2s ease',
                  '.MuiBox-root:hover &': {
                    color: 'rgba(255, 255, 255, 0.7)'
                  }
                }}
              >
                {formatTimeInTimezone(dayEvents[0].event_time, dayEvents[0].timezone)}
                {dayEvents[0].timezone ? ` (${formatTimezoneName(dayEvents[0].timezone)})` : ''}
              </Typography>
            </Box>
            
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
  // Use shortened day names for mobile
  const mobileWeekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <>
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
            p: isMobile ? 1 : 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <IconButton 
            onClick={() => navigateMonth(-1)} 
            sx={{ color: 'white' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography 
            variant={isMobile ? "subtitle1" : "h5"} 
            sx={{ color: 'white', fontWeight: 500 }}
          >
            {currentDate.toLocaleString('default', { 
              month: 'long', 
              year: isMobile ? '2-digit' : 'numeric' 
            })}
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
            {(isMobile ? mobileWeekDays : weekDays).map(day => (
              <Grid 
                item 
                key={day} 
                sx={{ 
                  width: `${100/7}%`,
                  borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                  p: isMobile ? 0.5 : 1
                }}
              >
                <Typography sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: isMobile ? '0.7rem' : '0.875rem',
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

      {/* Mobile event drawer */}
      {isMobile && (
        <SwipeableDrawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpen={() => setDrawerOpen(true)}
          disableSwipeToOpen={false}
          ModalProps={{
            keepMounted: true,
          }}
          PaperProps={{
            sx: {
              maxHeight: '70vh',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              bgcolor: '#1a1a1a',
              px: 2,
              pt: 2
            }
          }}
        >
          <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
            {selectedDate && `${currentDate.toLocaleString('default', { month: 'short' })} ${selectedDate}`}
          </Typography>
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map(event => (
              <Box
                key={event.id}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                  {event.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {formatTimeInTimezone(event.event_time, event.timezone)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, fontSize: '0.75rem' }}>
                  {formatTimezoneName(event.timezone)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      onEventClick(event);
                      setDrawerOpen(false);
                    }}
                    sx={{ flex: 1, bgcolor: '#90caf9', color: '#000' }}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      onSignUp(event.id);
                      setDrawerOpen(false);
                    }}
                    sx={{ flex: 1, borderColor: '#90caf9', color: '#90caf9' }}
                  >
                    Sign Up
                  </Button>
                </Box>
              </Box>
            ))
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                No events on this day
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2, bgcolor: '#90caf9', color: '#000' }}
                onClick={() => {
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate);
                  const defaultEventTime = new Date(dayDate.setHours(12, 0, 0, 0));
                  onEventClick({ event_time: defaultEventTime.toISOString() });
                  setDrawerOpen(false);
                }}
              >
                Create Event
              </Button>
            </Box>
          )}
        </SwipeableDrawer>
      )}
    </>
  );
};

export default CalendarView;