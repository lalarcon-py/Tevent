import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
import MembershipStats from './DashboardComponents/MembershipStats';
import CombatStats from './DashboardComponents/CombatStats';
import AttendanceStats from './DashboardComponents/AttendanceStats';
import WeaponStats from './DashboardComponents/WeaponStats';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [guildStats, setGuildStats] = useState({
    memberStats: null,
    combatStats: null,
    attendanceStats: null,
    weaponStats: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchGuildStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add headers to ensure we're sending auth tokens
        const config = {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        };

        const responses = await Promise.allSettled([
          axiosInstance.get('/api/stats/members', config),
          axiosInstance.get('/api/stats/combat', config),
          axiosInstance.get('/api/stats/attendance', config),
          axiosInstance.get('/api/stats/weapons', config)
        ]);

        // Process each response, checking for errors
        const processedResponses = responses.map(response => {
          if (response.status === 'fulfilled') {
            return response.value.data;
          } else {
            console.error('API call failed:', response.reason);
            return null;
          }
        });

        const [members, combat, attendance, weapons] = processedResponses;

        // Format the data before setting state
        setGuildStats({
          memberStats: members ? {
            ...members,
            cp_distribution: members.cp_distribution || [],
            role_distribution: members.role_distribution || {},
            weapon_combinations: members.weapon_combinations || {}
          } : null,
          combatStats: combat ? {
            roles: combat.roles || {},
            weapons: combat.weapons || { primary: {}, secondary: {} },
            specs: combat.specs || {}
          } : null,
          attendanceStats: attendance || null,
          weaponStats: weapons || null
        });

      } catch (error) {
        console.error('Error fetching guild stats:', error);
        setError(error.response?.data?.error || 'Failed to fetch guild stats');
      } finally {
        setLoading(false);
      }
    };

    fetchGuildStats();
    const interval = setInterval(fetchGuildStats, 300000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Your existing loading and error states remain the same
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#121212">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
        <Typography variant="h5" sx={{ color: 'white' }}>
          Please log in to view the dashboard
        </Typography>
      </Box>
    );
  }

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

  // Your existing return statement remains the same
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