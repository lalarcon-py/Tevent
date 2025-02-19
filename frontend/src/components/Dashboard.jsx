import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
import MembershipStats from './DashboardComponents/MembershipStats';
import CombatStats from './DashboardComponents/CombatStats';
import AttendanceStats from './DashboardComponents/AttendanceStats';
import WeaponStats from './DashboardComponents/WeaponStats';

const Dashboard = () => {
  const [guildStats, setGuildStats] = useState({
    memberStats: null,
    combatStats: null,
    attendanceStats: null,
    weaponStats: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuildStats = async () => {
      try {
        const [memberStats, combatStats, attendanceStats, weaponStats] = await Promise.all([
          axiosInstance.get('/api/stats/members'),
          axiosInstance.get('/api/stats/combat'),
          axiosInstance.get('/api/stats/attendance'),
          axiosInstance.get('/api/stats/weapons')
        ]);

        setGuildStats({
          memberStats: memberStats.data,
          combatStats: combatStats.data,
          attendanceStats: attendanceStats.data,
          weaponStats: weaponStats.data
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching guild stats:', error);
        setError('Failed to fetch guild stats');
        setLoading(false);

        // If the error is a 401, axios interceptor will handle the redirect
        if (error.response?.status !== 401) {
          setError('Failed to fetch guild stats');
        }
      }
    };

    fetchGuildStats();
    const interval = setInterval(fetchGuildStats, 300000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#121212">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
        <Typography variant="h5" sx={{ color: 'white' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: 'white', mb: 4 }}>
        Guild Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Membership Stats */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              bgcolor: '#1e1e1e', 
              color: 'white',
              '&:hover': {
                boxShadow: '0 0 15px rgba(144, 202, 249, 0.2)'
              }
            }}
          >
            <MembershipStats data={guildStats.memberStats} />
          </Paper>
        </Grid>

        {/* Combat Power Stats */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              bgcolor: '#1e1e1e', 
              color: 'white',
              '&:hover': {
                boxShadow: '0 0 15px rgba(144, 202, 249, 0.2)'
              }
            }}
          >
            <CombatStats data={guildStats.combatStats} />
          </Paper>
        </Grid>

        {/* Attendance Stats */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              bgcolor: '#1e1e1e', 
              color: 'white',
              '&:hover': {
                boxShadow: '0 0 15px rgba(144, 202, 249, 0.2)'
              }
            }}
          >
            <AttendanceStats data={guildStats.attendanceStats} />
          </Paper>
        </Grid>

        {/* Weapon Combinations */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              bgcolor: '#1e1e1e', 
              color: 'white',
              '&:hover': {
                boxShadow: '0 0 15px rgba(144, 202, 249, 0.2)'
              }
            }}
          >
            <WeaponStats data={guildStats.weaponStats} />
          </Paper>
        </Grid>
      </Grid>

      {/* Fallback message if no data is available */}
      {!guildStats.memberStats && !guildStats.combatStats && 
       !guildStats.attendanceStats && !guildStats.weaponStats && (
        <Typography variant="h6" sx={{ color: 'white', mt: 4, textAlign: 'center' }}>
          No guild statistics available at this time
        </Typography>
      )}
    </Box>
  );
};

export default Dashboard;