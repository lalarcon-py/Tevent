// EventPlanner/EventList.jsx
import { 
    List, 
    ListItem, 
    ListItemText, 
    Typography,
    IconButton 
  } from '@mui/material';
  import { format } from 'date-fns';
  import DeleteIcon from '@mui/icons-material/Delete';
  
  const EventList = ({ events, onEventSelect, selectedEvent, onEventDelete }) => {
    return (
      <List sx={{ width: '100%' }}>
        {events.map((event) => (
          <ListItem
            key={event.id}
            button
            selected={selectedEvent?.id === event.id}
            onClick={() => onEventSelect(event)}
            sx={{
              borderRadius: 1,
              mb: 1,
              '&.Mui-selected': {
                backgroundColor: 'rgba(144, 202, 249, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(144, 202, 249, 0.3)',
                }
              },
              '&:hover': {
                backgroundColor: 'rgba(144, 202, 249, 0.1)',
              }
            }}
            secondaryAction={
              <IconButton 
                edge="end" 
                aria-label="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onEventDelete(event.id);
                }}
                sx={{ color: '#ff4444' }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={
                <Typography sx={{ color: 'white' }}>
                  {event.title}
                </Typography>
              }
              secondary={
                <Typography sx={{ color: 'grey.400' }}>
                  {format(new Date(event.eventTime), 'MMM dd, yyyy HH:mm')}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };
  
  export default EventList;