// src/components/DashboardComponents/WeaponStats.jsx
import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WeaponStats = ({ data }) => {
  if (!data) return <Typography>Loading weapon stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Popular Weapon Combinations</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data?.weaponCombinations || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="combination" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default WeaponStats;