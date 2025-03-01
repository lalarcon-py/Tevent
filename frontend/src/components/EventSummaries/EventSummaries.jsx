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
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { format, parseISO, isPast } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL;

const EventSummaries = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/events`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        // Sort events by date (soonest first) and filter out past events
        const upcomingEvents = data
          .filter(event => !isPast(new Date(event.event_time)))
          .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
        
        setEvents(upcomingEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

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
      
      {events.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: '#1e1e1e', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary">
            No upcoming events
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/event-planner')}
            sx={{ mt: 2 }}
          >
            Create an Event
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {events.map(event => {
            // Calculate participation statistics
            const totalParticipants = event.participants?.length || 0;
            const tankCount = event.participants?.filter(p => p.role === 'TANK').length || 0;
            const healerCount = event.participants?.filter(p => p.role === 'HEALER').length || 0;
            const dpsCount = event.participants?.filter(p => p.role === 'DPS').length || 0;
            
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
                  
                  <CardActions sx={{ p: 2 }}>
                    <Button 
                      variant="contained" 
                      fullWidth
                      onClick={() => navigateToTeamPlanner(event.id)}
                      sx={{
                        bgcolor: '#90caf9',
                        color: '#212121',
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: '#64b5f6'
                        }
                      }}
                    >
                      View Teams & Sign Up
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default EventSummaries;