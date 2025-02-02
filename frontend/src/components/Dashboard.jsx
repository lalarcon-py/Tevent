import { Box, Grid, Paper, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

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

  useEffect(() => {
    const fetchGuildStats = async () => {
      try {
        const [memberResponse, combatResponse, attendanceResponse, weaponResponse] = await Promise.all([
          fetch('http://localhost:5000/api/stats/members', { credentials: 'include' }),
          fetch('http://localhost:5000/api/stats/combat', { credentials: 'include' }),
          fetch('http://localhost:5000/api/stats/attendance', { credentials: 'include' }),
          fetch('http://localhost:5000/api/stats/weapons', { credentials: 'include' })
        ]);

        const [memberStats, combatStats, attendanceStats, weaponStats] = await Promise.all([
          memberResponse.json(),
          combatResponse.json(),
          attendanceResponse.json(),
          weaponResponse.json()
        ]);

        setGuildStats({
          memberStats,
          combatStats,
          attendanceStats,
          weaponStats
        });
      } catch (error) {
        console.error('Error fetching guild stats:', error);
      }
    };

    fetchGuildStats();
    // Set up polling every 5 minutes
    const interval = setInterval(fetchGuildStats, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: 'white', mb: 4 }}>
        Guild Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Membership Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
            <MembershipStats data={guildStats.memberStats} />
          </Paper>
        </Grid>

        {/* Combat Power Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
            <CombatStats data={guildStats.combatStats} />
          </Paper>
        </Grid>

        {/* Attendance Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
            <AttendanceStats data={guildStats.attendanceStats} />
          </Paper>
        </Grid>

        {/* Weapon Combinations */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: 'white' }}>
            <WeaponStats data={guildStats.weaponStats} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;