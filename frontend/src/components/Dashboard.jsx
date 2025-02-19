import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
import MembershipStats from './DashboardComponents/MembershipStats';
import CombatStats from './DashboardComponents/CombatStats';
import AttendanceStats from './DashboardComponents/AttendanceStats';
import WeaponStats from './DashboardComponents/WeaponStats';
import { useAuth } from '../contexts/AuthContext'; // Add this

const Dashboard = () => {
  const { isAuthenticated, loading: authLoading } = useAuth(); // Add this
  const [guildStats, setGuildStats] = useState({
    memberStats: null,
    combatStats: null,
    attendanceStats: null,
    weaponStats: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch if authenticated
    if (!isAuthenticated) return;

    const fetchGuildStats = async () => {
      try {
        setLoading(true);
        const responses = await Promise.all([
          axiosInstance.get('/api/stats/members'),
          axiosInstance.get('/api/stats/combat'),
          axiosInstance.get('/api/stats/attendance'),
          axiosInstance.get('/api/stats/weapons')
        ]);

        setGuildStats({
          memberStats: responses[0].data,
          combatStats: responses[1].data,
          attendanceStats: responses[2].data,
          weaponStats: responses[3].data
        });
      } catch (error) {
        console.error('Error fetching guild stats:', error);
        setError('Failed to fetch guild stats');
      } finally {
        setLoading(false);
      }
    };

    fetchGuildStats();
    const interval = setInterval(fetchGuildStats, 300000);
    return () => clearInterval(interval);
  }, [isAuthenticated]); // Add isAuthenticated as dependency

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#121212">
        <CircularProgress />
      </Box>
    );
  }

  // Show auth message if not authenticated
  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
        <Typography variant="h5" sx={{ color: 'white' }}>
          Please log in to view the dashboard
        </Typography>
      </Box>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#121212">
        <CircularProgress />
      </Box>
    );
  }

  // Show error state if fetch failed
  if (error) {
    return (
      <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
        <Typography variant="h5" sx={{ color: 'white' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  // Only render stats components if we have data
  return (
    <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: 'white', mb: 4 }}>
        Guild Dashboard
      </Typography>

      <Grid container spacing={3}>
        {guildStats.memberStats && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
              <MembershipStats data={guildStats.memberStats} />
            </Paper>
          </Grid>
        )}

        {guildStats.combatStats && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
              <CombatStats data={guildStats.combatStats} />
            </Paper>
          </Grid>
        )}

        {guildStats.attendanceStats && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
              <AttendanceStats data={guildStats.attendanceStats} />
            </Paper>
          </Grid>
        )}

        {guildStats.weaponStats && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
              <WeaponStats data={guildStats.weaponStats} />
            </Paper>
          </Grid>
        )}
      </Grid>

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