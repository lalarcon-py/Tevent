// src/components/DashboardComponents/AttendanceStats.jsx
import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

class AttendanceStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      period: 30,
      totalEvents: 0,
      averageAttendance: 0,
      filteredHistory: [],
      modalOpen: false,
      selectedEvent: null,
      memberSearch: ''
    };
  }

  componentDidMount() {
    this.processData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.data !== this.props.data || prevState.period !== this.state.period) {
      this.processData();
    }
  }

  setPeriod = async (days) => {
    // Set period and inform parent component
    this.setState({ period: days }, () => {
      console.log(`Period changed to ${days} days. Processing data...`);
      // First try with client-side filtering for immediate feedback
      this.processData();
      
      // Then notify parent to fetch fresh data from server
      if (this.props.onPeriodChange) {
        this.props.onPeriodChange(days);
      }
    });
  }

  processData = () => {
    try {
      const { data } = this.props;
      const { period } = this.state;
      
      console.log("Attendance data in component:", data);
      
      if (!data) return;
      
      // Log full data received for debugging
      console.log("Raw attendance data received:", JSON.stringify(data, null, 2));
      
      // Initialize with zero values as default
      let allEvents = [];
      let averageAttendance = 0;
      
      // First check if we have attendance_history directly in the data
      if (data.attendance_history && Array.isArray(data.attendance_history)) {
        console.log("Using attendance_history from data");
        allEvents = data.attendance_history.map(event => ({
          id: event.id,
          date: event.date,
          attendance_rate: event.attendance_rate || 0, // Default to 0%, not 100%
          attendance_count: event.attendance_count || 0,
          title: event.title || "Event",
          total_members: event.total_members || 0,
          participants: event.participants || []
        }));
      } 
      // Fallback to events array if available
      else if (data.events && Array.isArray(data.events)) {
        console.log("Using events array for attendance");
        allEvents = data.events.map(event => {
          // Calculate the actual rate - default to 0% if not available
          const confirmedParticipants = event.participants ? 
            event.participants.filter(p => p.status === 'CONFIRMED') : [];
          const participantCount = confirmedParticipants.length;
          const totalMembers = data.total_members || 1; // Prevent division by zero
          const attendanceRate = event.attendance_rate || (participantCount / totalMembers * 100) || 0;
          
          return {
            id: event.id,
            date: event.date || event.event_time,
            attendance_rate: attendanceRate, // Use calculated rate or 0
            attendance_count: participantCount,
            title: event.title || "Event",
            total_members: totalMembers,
            participants: confirmedParticipants || [],
            absentees: event.absentees || [],
            tentatives: event.tentatives || []
          };
        });
      }
      // Direct array of events without nested structure
      else if (Array.isArray(data)) {
        console.log("Using direct array of events");
        allEvents = data.map(event => {
          // Calculate the actual rate - default to 0% if not available
          const confirmedParticipants = event.participants ? 
            event.participants.filter(p => p.status === 'CONFIRMED') : [];
          const participantCount = confirmedParticipants.length;
          const totalMembers = event.total_members || 1; // Without context, we use a placeholder
          const attendanceRate = event.attendance_rate || (participantCount / totalMembers * 100) || 0;
          
          return {
            id: event.id,
            date: event.date || event.event_time,
            attendance_rate: attendanceRate, // Use calculated rate or 0
            attendance_count: participantCount,
            title: event.title || "Event",
            total_members: totalMembers,
            participants: confirmedParticipants || [],
            absentees: event.absentees || [],
            tentatives: event.tentatives || []
          };
        });
      }
      
      // Use the average attendance rate from data if available
      if (typeof data.average_attendance_rate === 'number') {
        console.log("Using average_attendance_rate from data:", data.average_attendance_rate);
        averageAttendance = data.average_attendance_rate;
      }
      
      // Log what we found
      console.log("Found events before filtering:", allEvents.length);
      
      // Apply date filter based on selected period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - period);
      console.log(`Filtering events by date: ${cutoffDate.toISOString()}`);
      
      // Filter events by date range
      const filteredEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= cutoffDate;
      });
      
      console.log(`Filtered to ${filteredEvents.length} events in the last ${period} days`);
      
      // Calculate new totals based on filtered events
      const totalFilteredEvents = filteredEvents.length;
      
      // Calculate new average based on filtered events
      if (filteredEvents.length > 0) {
        const sum = filteredEvents.reduce((acc, event) => 
          acc + (typeof event.attendance_rate === 'number' ? event.attendance_rate : 0), 0);
        averageAttendance = Math.round(sum / filteredEvents.length);
      } else {
        averageAttendance = 0; // Default to 0% when no events
      }
      
      console.log("Processed attendance data:", {
        period,
        totalEvents: totalFilteredEvents,
        averageAttendance,
        filteredEventsCount: filteredEvents.length
      });
      
      // Sort filtered events by date (newest first) before saving to state
      const sortedEvents = filteredEvents.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date) - new Date(a.date);
      });
      
      this.setState({
        totalEvents: totalFilteredEvents,
        averageAttendance,
        filteredHistory: sortedEvents.slice(0, 10) // Only keep the most recent 10 events
      });
    } catch (error) {
      console.error("Error processing attendance data:", error);
    }
  }
  
  formatDate = (dateString, options = {}) => {
    try {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date)) return "Invalid date";
      return date.toLocaleDateString('en-US', options);
    } catch {
      return "Invalid date";
    }
  }
  
  getAttendanceColor = (rate) => {
    if (rate >= 85) return '#4caf50';
    if (rate >= 70) return '#ff9800';
    return '#f44336';
  }

  // Open member attendance modal
  showMemberAttendance = (event) => {
    const { filteredHistory } = this.state;
    const selectedEvent = filteredHistory.find(e => e.id === event.id);
    
    if (!selectedEvent) return;
    
    this.setState({
      modalOpen: true,
      selectedEvent,
      memberSearch: ''
    });
  }
  
  // Close the modal
  handleCloseModal = () => {
    this.setState({
      modalOpen: false,
      selectedEvent: null,
      memberSearch: ''
    });
  }
  
  // Handle member search input change
  handleSearchChange = (e) => {
    this.setState({ memberSearch: e.target.value });
  }
  
  // Filter members based on search term
  filterMembers = (members) => {
    const { memberSearch } = this.state;
    
    if (!memberSearch.trim() || !members) return members;
    
    const searchTerm = memberSearch.toLowerCase();
    return members.filter(member => {
      const username = member.User?.username || '';
      return username.toLowerCase().includes(searchTerm);
    });
  }

  render() {
    const { totalEvents, averageAttendance, filteredHistory, period } = this.state;
    
    if (!this.props.data) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Event Attendance
          </Typography>
          <Typography>No attendance data available yet.</Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: 'bold',
            m: 0
          }}>
            <EventIcon sx={{ mr: 1, color: '#ba68c8' }} />
            Event Attendance
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[7, 14, 30, 90].map(days => (
              <Button 
                key={days}
                variant={period === days ? "contained" : "outlined"}
                size="small"
                onClick={() => this.setPeriod(days)}
                sx={{ 
                  minWidth: '40px',
                  backgroundColor: period === days ? 'rgba(186, 104, 200, 0.8)' : 'transparent',
                  color: period === days ? 'white' : 'rgba(255,255,255,0.7)'
                }}
              >
                {days}d
              </Button>
            ))}
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 3,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'rgba(20, 20, 30, 0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Total Events</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ba68c8' }}>{totalEvents}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>past {period} days</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 3,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'rgba(20, 20, 30, 0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Average Attendance</Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 'bold',
                  color: this.getAttendanceColor(averageAttendance)
                }}
              >
                {averageAttendance}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>participation rate</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Simple attendance trend display */}
        <Box sx={{ mb: 4, bgcolor: 'rgba(20, 20, 30, 0.4)', p: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Attendance Trend
          </Typography>
          
          {filteredHistory.length > 0 ? (
            <Grid container spacing={2}>
              {filteredHistory.slice(0, 5).map((event, index) => (
                <Grid item xs={6} sm={4} md={2.4} key={index}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(20, 20, 30, 0.6)', 
                    borderRadius: 2,
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      {this.formatDate(event.date, { month: 'short', day: 'numeric' })}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: this.getAttendanceColor(event.attendance_rate || 0)
                      }}
                    >
                      {Math.round(event.attendance_rate || 0)}%
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
              No attendance data available for the selected period
            </Typography>
          )}
        </Box>

        {/* Latest Events List with clickable entries */}
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Latest Events
        </Typography>
        
        {filteredHistory.length > 0 ? (
          <List sx={{ 
            bgcolor: 'rgba(20, 20, 30, 0.4)',
            borderRadius: 2
          }}>
            {filteredHistory.slice(0, 7).map((event, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider component="li" sx={{ opacity: 0.2 }} />}
                <ListItem 
                  alignItems="flex-start" 
                  sx={{ 
                    py: 1.5,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                  onClick={() => this.showMemberAttendance(event)}
                  button
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'rgba(186, 104, 200, 0.2)', color: '#ba68c8' }}>
                      <EventIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {event.title || `Event on ${this.formatDate(event.date, { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric' 
                        })}`}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                            {event.attendance_count || 0} members
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${Math.round(event.attendance_rate || 0)}%`}
                          size="small"
                          sx={{ 
                            ml: 1.5,
                            height: 22,
                            fontSize: '0.8rem',
                            bgcolor: this.getAttendanceColor(event.attendance_rate || 0),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(20, 20, 30, 0.4)', borderRadius: 2 }}>
            <Typography color="text.secondary">
              No events found in the selected period
            </Typography>
          </Box>
        )}
        {/* Member Attendance Modal */}
        <Dialog 
          open={this.state.modalOpen} 
          onClose={this.handleCloseModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(30, 30, 40, 0.95)',
              backgroundImage: 'linear-gradient(rgba(55, 65, 81, 0.1) 1px, transparent 1px), linear-gradient(to right, rgba(55, 65, 81, 0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          {this.state.selectedEvent && (
            <React.Fragment>
              <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                pb: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EventIcon sx={{ mr: 1, color: '#ba68c8' }} />
                  <Typography variant="h6" component="div">
                    {this.state.selectedEvent.title || `Event on ${this.formatDate(this.state.selectedEvent.date, { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric' 
                    })}`}
                  </Typography>
                </Box>
                <IconButton onClick={this.handleCloseModal} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              
              <DialogContent sx={{ p: 3 }}>
                {/* Event details summary */}
                <Box sx={{ mb: 4, p: 2, borderRadius: 2, bgcolor: 'rgba(20, 20, 30, 0.6)' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Date</Typography>
                      <Typography variant="body1">
                        {this.formatDate(this.state.selectedEvent.date, { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Attendance</Typography>
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label={`${Math.round(this.state.selectedEvent.attendance_rate || 0)}%`}
                          size="small"
                          sx={{ 
                            mr: 1,
                            height: 24,
                            fontSize: '0.8rem',
                            bgcolor: this.getAttendanceColor(this.state.selectedEvent.attendance_rate || 0),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                        {this.state.selectedEvent.attendance_count || 0} of {this.state.selectedEvent.total_members || '?'} members
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Missing Members</Typography>
                      <Typography variant="body1">
                        {Math.max(0, (this.state.selectedEvent.total_members || 0) - 
                          (this.state.selectedEvent.participants?.length || 0) - 
                          (this.state.selectedEvent.tentatives?.length || 0) -
                          (this.state.selectedEvent.absentees?.length || 0)
                        )} members did not respond
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                {/* Member search */}
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search members..."
                  value={this.state.memberSearch}
                  onChange={this.handleSearchChange}
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      bgcolor: 'rgba(20, 20, 30, 0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 1,
                      '&:hover': {
                        border: '1px solid rgba(255,255,255,0.2)',
                      }
                    }
                  }}
                />
                
                <Grid container spacing={3}>
                  {/* Present members */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      fontWeight: 'bold',
                      color: '#4caf50', // Green color
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      Present Members ({this.state.selectedEvent.participants?.length || 0})
                    </Typography>
                    
                    <List sx={{ 
                      bgcolor: 'rgba(76, 175, 80, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}>
                      {this.filterMembers(this.state.selectedEvent.participants)?.map((participant, index) => (
                        <ListItem key={index} divider={index < (this.state.selectedEvent.participants?.length || 0) - 1}>
                          <ListItemAvatar>
                            <Avatar src={participant.User?.avatar_url} alt={participant.User?.username} />
                          </ListItemAvatar>
                          <ListItemText 
                            primary={participant.User?.username || 'Unknown'}
                            secondary={`Role: ${participant.role || 'Not specified'}`}
                          />
                        </ListItem>
                      ))}
                      {(!this.state.selectedEvent.participants || this.state.selectedEvent.participants.length === 0) && (
                        <ListItem>
                          <ListItemText primary={<Typography color="text.secondary">No members present</Typography>} />
                        </ListItem>
                      )}
                      {(this.state.selectedEvent.participants?.length > 0 && 
                        this.filterMembers(this.state.selectedEvent.participants)?.length === 0) && (
                        <ListItem>
                          <ListItemText primary={<Typography color="text.secondary">No matching members</Typography>} />
                        </ListItem>
                      )}
                    </List>
                  </Grid>
                  
                  {/* Tentative members */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      fontWeight: 'bold',
                      color: '#ff9800', // Orange color
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      Tentative Members ({this.state.selectedEvent.tentatives?.length || 0})
                    </Typography>
                    
                    <List sx={{ 
                      bgcolor: 'rgba(255, 152, 0, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(255, 152, 0, 0.2)',
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}>
                      {this.filterMembers(this.state.selectedEvent.tentatives)?.map((tentative, index) => (
                        <ListItem key={index} divider={index < (this.state.selectedEvent.tentatives?.length || 0) - 1}>
                          <ListItemAvatar>
                            <Avatar src={tentative.User?.avatar_url} alt={tentative.User?.username} />
                          </ListItemAvatar>
                          <ListItemText 
                            primary={tentative.User?.username || 'Unknown'}
                            secondary="Status: Tentative"
                          />
                        </ListItem>
                      ))}
                      {(!this.state.selectedEvent.tentatives || this.state.selectedEvent.tentatives.length === 0) && (
                        <ListItem>
                          <ListItemText primary={<Typography color="text.secondary">No tentative members</Typography>} />
                        </ListItem>
                      )}
                      {(this.state.selectedEvent.tentatives?.length > 0 && 
                        this.filterMembers(this.state.selectedEvent.tentatives)?.length === 0) && (
                        <ListItem>
                          <ListItemText primary={<Typography color="text.secondary">No matching members</Typography>} />
                        </ListItem>
                      )}
                    </List>
                  </Grid>
                  
                  {/* Absent members */}
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      fontWeight: 'bold',
                      color: '#f44336', // Red color
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      Absent Members ({this.state.selectedEvent.absentees?.length || 0})
                    </Typography>
                    
                    <List sx={{ 
                      bgcolor: 'rgba(244, 67, 54, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(244, 67, 54, 0.2)',
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}>
                      {this.filterMembers(this.state.selectedEvent.absentees)?.map((absentee, index) => (
                        <ListItem key={index} divider={index < (this.state.selectedEvent.absentees?.length || 0) - 1}>
                          <ListItemAvatar>
                            <Avatar src={absentee.User?.avatar_url} alt={absentee.User?.username} />
                          </ListItemAvatar>
                          <ListItemText 
                            primary={absentee.User?.username || 'Unknown'}
                            secondary="Status: Absent"
                          />
                        </ListItem>
                      ))}
                      {(!this.state.selectedEvent.absentees || this.state.selectedEvent.absentees.length === 0) && (
                        <ListItem>
                          <ListItemText primary={<Typography color="text.secondary">No reported absences</Typography>} />
                        </ListItem>
                      )}
                      {(this.state.selectedEvent.absentees?.length > 0 && 
                        this.filterMembers(this.state.selectedEvent.absentees)?.length === 0) && (
                        <ListItem>
                          <ListItemText primary={<Typography color="text.secondary">No matching members</Typography>} />
                        </ListItem>
                      )}
                    </List>
                  </Grid>
                </Grid>
              </DialogContent>
              
              <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Button onClick={this.handleCloseModal} variant="outlined" color="primary">
                  Close
                </Button>
              </DialogActions>
            </React.Fragment>
          )}
        </Dialog>
      </Box>
    );
  }
}

export default AttendanceStats;