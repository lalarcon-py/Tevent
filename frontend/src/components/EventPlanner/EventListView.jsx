// EventPlanner/EventListView.jsx
import { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Chip,
  Collapse,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format, isSameDay, startOfDay } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL;

const EventListView = ({ events, onEventSelect, onEventUpdate }) => {
  const [expandedDay, setExpandedDay] = useState(null);
  const [guildId, setGuildId] = useState(null);


  useEffect(() => {
    const fetchGuildId = async () => {
      try {
        const response = await fetch(`${API_URL}/api/guilds/my-guilds`, {
          credentials: 'include'
        });
        if (response.ok) {
          const guilds = await response.json();
          if (guilds.length > 0) {
            setGuildId(guilds[0].id);
            console.log('Using guild ID for event list:', guilds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching user guilds:', error);
      }
    };
    
    fetchGuildId();
  }, []);

  // Group events by day
  const groupedEvents = events.reduce((groups, event) => {
    const day = startOfDay(new Date(event.eventTime)).toISOString();
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(event);
    return groups;
  }, {});

  const handleDelete = async (eventId) => {
    try {
      const url = guildId 
        ? `${API_URL}/api/events/${eventId}?guildId=${guildId}`
        : `${API_URL}/api/events/${eventId}`;
        
      await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });
      onEventUpdate();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  return (
    <List sx={{ width: '100%' }}>
      {Object.entries(groupedEvents)
        .sort(([dayA], [dayB]) => new Date(dayA) - new Date(dayB))
        .map(([day, dayEvents]) => (
          <Box key={day} sx={{ mb: 2, bgcolor: '#252525', borderRadius: 1 }}>
            <ListItem
              button
              onClick={() => setExpandedDay(expandedDay === day ? null : day)}
              sx={{
                borderBottom: '1px solid #333',
                '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {format(new Date(day), 'EEEE, MMMM d, yyyy')}
                  </Typography>
                }
                secondary={
                  <Typography sx={{ color: 'grey.400' }}>
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </Typography>
                }
              />
              {expandedDay === day ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>

            <Collapse in={expandedDay === day}>
              <List component="div" disablePadding>
                {dayEvents
                  .sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime))
                  .map((event) => (
                    <ListItem
                      key={event.id}
                      sx={{
                        pl: 4,
                        borderBottom: '1px solid #333',
                        '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              <Typography sx={{ color: 'white' }}>
                                {event.title}
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Chip
                                size="small"
                                label={`${format(new Date(event.eventTime), 'HH:mm')}`}
                                sx={{ bgcolor: '#333', color: 'white' }}
                              />
                            </Grid>
                          </Grid>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Grid container spacing={1}>
                              <Grid item>
                                <Chip
                                  size="small"
                                  label={`Tanks: ${event.participants?.filter(p => p.role === 'TANK').length || 0}/${event.tanks}`}
                                  sx={{ bgcolor: '#2196f3', color: 'white' }}
                                />
                              </Grid>
                              <Grid item>
                                <Chip
                                  size="small"
                                  label={`Healers: ${event.participants?.filter(p => p.role === 'HEALER').length || 0}/${event.healers}`}
                                  sx={{ bgcolor: '#4caf50', color: 'white' }}
                                />
                              </Grid>
                              <Grid item>
                                <Chip
                                  size="small"
                                  label={`DPS: ${event.participants?.filter(p => p.role === 'DPS').length || 0}/${event.dps}`}
                                  sx={{ bgcolor: '#f44336', color: 'white' }}
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        }
                      />
                      <IconButton
                        onClick={() => onEventSelect(event)}
                        sx={{ color: '#90caf9' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(event.id)}
                        sx={{ color: '#ff4444' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
              </List>
            </Collapse>
          </Box>
        ))}
    </List>
  );
};

export default EventListView;