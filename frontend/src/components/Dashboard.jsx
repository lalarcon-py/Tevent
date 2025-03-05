// src/components/Dashboard.jsx
import React from 'react';
import { Box, Grid, Typography, Paper, CircularProgress, Alert, Button, Container } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MembershipStats from './DashboardComponents/MembershipStats';
import AttendanceStats from './DashboardComponents/AttendanceStats';
import CombatStats from './DashboardComponents/CombatStats';
import axiosInstance from '../config/axios';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <Alert severity="error">Component error. Please refresh the page.</Alert>;
    }
    return this.props.children;
  }
}

class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {
        members: [],
        events: [],
        combat: {},
        guildMembers: []
      },
      guildName: 'Guild', // Default guild name
      loading: true,
      error: null,
      guildId: null
    };
    this.mounted = false;
  }

  componentDidMount() {
    this.mounted = true;
    this.loadGuildId();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  loadGuildId = () => {
    try {
      const storedGuildId = localStorage.getItem('guildId');
      if (storedGuildId && this.mounted) {
        this.setState({ guildId: storedGuildId }, () => {
          this.fetchGuildInfo();
          this.fetchDashboardData();
        });
      } else {
        if (this.mounted) {
          this.setState({ loading: false });
        }
      }
    } catch (e) {
      console.warn('Failed to access localStorage:', e);
      if (this.mounted) {
        this.setState({ loading: false });
      }
    }
  };

  fetchGuildInfo = async () => {
    const { guildId } = this.state;
    if (!guildId) return;
    
    try {
      // Fetch guild details to get the name
      const response = await axiosInstance.get(`/api/guilds/${guildId}`);
      if (response.data && response.data.name) {
        this.setState({ guildName: response.data.name });
      }
    } catch (error) {
      console.error('Error fetching guild info:', error);
      // Don't set an error state here - just fallback to default guild name
    }
  };

  fetchDashboardData = async () => {
    const { guildId } = this.state;
    if (!guildId) return;
    
    if (this.mounted) {
      this.setState({ loading: true });
    }
    
    try {
      console.log("Fetching dashboard data for guild:", guildId);
      
      // Initialize with expected structure
      let membersData = [];
      let eventsData = [];
      let combatData = {};
      let guildMembersData = [];
      
      // Fetch guild members (raw data)
      try {
        const guildMembersRes = await axiosInstance.get(`/api/guilds/${guildId}/members`);
        console.log("Guild Members API response:", guildMembersRes.data);
        if (guildMembersRes.data && Array.isArray(guildMembersRes.data)) {
          guildMembersData = guildMembersRes.data.map(member => ({
            ...member,
            builds: Array.isArray(member.builds) ? member.builds : 
                    typeof member.builds === 'string' ? JSON.parse(member.builds) : []
          }));
        }
      } catch (err) {
        console.warn('Failed to load guild members:', err);
      }
      
      // Fetch stats data
      try {
        const membersRes = await axiosInstance.get(`/api/stats/members?guildId=${guildId}`);
        console.log("Members API response:", membersRes.data);
        if (membersRes.data && typeof membersRes.data === 'object') {
          membersData = membersRes.data;
        }
      } catch (err) {
        console.warn('Failed to load members data:', err);
      }
      
      try {
        const eventsRes = await axiosInstance.get(`/api/events?guildId=${guildId}`);
        console.log("Events API response:", eventsRes.data);
        if (eventsRes.data && Array.isArray(eventsRes.data)) {
          eventsData = eventsRes.data;
        }
      } catch (err) {
        console.warn('Failed to load events data:', err);
      }
      
      try {
        const combatRes = await axiosInstance.get(`/api/stats/combat?guildId=${guildId}`);
        console.log("Combat API response:", combatRes.data);
        if (combatRes.data && typeof combatRes.data === 'object') {
          combatData = combatRes.data;
        }
      } catch (err) {
        console.warn('Failed to load combat data:', err);
      }
      
      if (this.mounted) {
        this.setState({
          data: {
            members: membersData,
            events: eventsData,
            combat: combatData,
            guildMembers: guildMembersData
          },
          error: null,
          loading: false
        });
      }
    } catch (err) {
      if (this.mounted) {
        console.error('Dashboard error:', err);
        this.setState({ 
          error: 'Failed to load dashboard data',
          loading: false
        });
      }
    }
  };

  render() {
    const { loading, error, data, guildName } = this.state;

    // Loading state
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress size={60} thickness={4} sx={{ color: '#64b5f6' }} />
        </Box>
      );
    }

    // Error state
    if (error) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <Alert 
            severity="error" 
            sx={{ maxWidth: 600 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={this.fetchDashboardData}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ 
        position: 'relative',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, rgba(18,18,24,1) 0%, rgba(32,32,40,1) 100%)',
        pb: 5,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 15% 50%, rgba(76, 175, 80, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(33, 150, 243, 0.08), transparent 25%)',
          pointerEvents: 'none',
          zIndex: 0,
        }
      }}>
        <Container maxWidth="xl" sx={{ pt: 4, position: 'relative', zIndex: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            mb: 4, 
            pb: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <DashboardIcon sx={{ 
              mr: 2, 
              fontSize: 40, 
              color: '#64b5f6'
            }} />
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #64b5f6 30%, #81c784 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {guildName} Dashboard
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* Membership Stats */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                background: 'rgba(30, 30, 40, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25), 0 8px 10px rgba(76, 175, 80, 0.15)'
                }
              }}>
                <ErrorBoundary>
                  <MembershipStats data={data.members} guildMembers={data.guildMembers} />
                </ErrorBoundary>
              </Paper>
            </Grid>

            {/* Attendance Stats */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                background: 'rgba(30, 30, 40, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25), 0 8px 10px rgba(156, 39, 176, 0.15)'
                }
              }}>
                <ErrorBoundary>
                  <AttendanceStats data={{events: data.events}} />
                </ErrorBoundary>
              </Paper>
            </Grid>

            {/* Combat Stats */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                background: 'rgba(30, 30, 40, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25), 0 8px 10px rgba(33, 150, 243, 0.15)'
                }
              }}>
                <ErrorBoundary>
                  <CombatStats data={data.combat} guildMembers={data.guildMembers} />
                </ErrorBoundary>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }
}

export default Dashboard;