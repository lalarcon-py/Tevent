import React from 'react';
import { Typography, Box } from '@mui/material';

const AttendanceStats = ({ data }) => {
  if (!data) return <Typography>Loading attendance stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Event Attendance
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Typography>Total Events: {data.total_events}</Typography>
        <Typography>Average Attendance: {Math.round(data.average_attendance_rate)}%</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.attendance_history?.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ minWidth: 100 }}>
              {new Date(item.date).toLocaleDateString()}
            </Typography>
            <Box 
              sx={{ 
                height: 20, 
                backgroundColor: '#8884d8',
                width: `${(item.attendance_count / Math.max(...data.attendance_history.map(d => d.attendance_count))) * 100}%`
              }} 
            />
            <Typography>{item.attendance_count}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AttendanceStats;