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
  Grid
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';

class AttendanceStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      period: 30,
      totalEvents: 0,
      averageAttendance: 0,
      filteredHistory: []
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

  setPeriod = (days) => {
    this.setState({ period: days });
  }

  processData = () => {
    try {
      const { data } = this.props;
      
      if (!data) return;
      
      // Check if data structure is what we expect
      console.log("Processing attendance data:", JSON.stringify(data, null, 2));
      
      // Calculate attendance metrics
      let totalEvents = 0;
      let averageAttendance = 0;
      let filteredHistory = [];
      
      // Extract values from data
      if (data.events && Array.isArray(data.events)) {
        totalEvents = data.events.length;
        filteredHistory = data.events.map(event => ({
          date: event.date || event.event_time,
          attendance_rate: event.attendance_rate || 100, // Default to 100% if not specified
          attendance_count: event.attendance_count || (event.participants ? event.participants.length : 0)
        }));
      }
      
      // Check for attendance_history
      if (data.attendance_history && Array.isArray(data.attendance_history)) {
        filteredHistory = data.attendance_history;
      }
      
      // Get average attendance directly or calculate it
      if (typeof data.average_attendance_rate === 'number') {
        averageAttendance = data.average_attendance_rate;
      } else if (filteredHistory.length > 0) {
        const sum = filteredHistory.reduce((acc, event) => 
          acc + (typeof event.attendance_rate === 'number' ? event.attendance_rate : 100), 0);
        averageAttendance = Math.round(sum / filteredHistory.length);
      } else {
        // Fallback value
        averageAttendance = 100;
      }
      
      // Set total events from data or from filtered history
      if (typeof data.total_events === 'number') {
        totalEvents = data.total_events;
      } else {
        totalEvents = filteredHistory.length;
      }
      
      this.setState({
        totalEvents,
        averageAttendance,
        filteredHistory: filteredHistory.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return new Date(b.date) - new Date(a.date);
        }).slice(0, 10) // Only keep the most recent 10 events
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
                        color: this.getAttendanceColor(event.attendance_rate || 100)
                      }}
                    >
                      {Math.round(event.attendance_rate || 100)}%
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

        {/* Latest Events List */}
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
                <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'rgba(186, 104, 200, 0.2)', color: '#ba68c8' }}>
                      <EventIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        Event on {this.formatDate(event.date, { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric' 
                        })}
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
                          label={`${Math.round(event.attendance_rate || 100)}%`}
                          size="small"
                          sx={{ 
                            ml: 1.5,
                            height: 22,
                            fontSize: '0.8rem',
                            bgcolor: this.getAttendanceColor(event.attendance_rate || 100),
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
      </Box>
    );
  }
}

export default AttendanceStats;