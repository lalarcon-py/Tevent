// DashboardComponents/MembershipStats.jsx
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MembershipStats = ({ data }) => {
  if (!data) return <Typography>Loading membership stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Membership Trends</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.dailyStats}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Line type="monotone" dataKey="activeMembers" stroke="#8884d8" />
          <Line type="monotone" dataKey="averageMembers" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default MembershipStats;