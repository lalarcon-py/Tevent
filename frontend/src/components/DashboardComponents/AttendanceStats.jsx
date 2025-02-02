// src/components/DashboardComponents/AttendanceStats.jsx
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AttendanceStats = ({ data }) => {
  if (!data) return <Typography>Loading attendance stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Event Attendance</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data?.attendanceHistory || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Line type="monotone" dataKey="attendance" stroke="#82ca9d" />
          <Line type="monotone" dataKey="averageAttendance" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AttendanceStats;