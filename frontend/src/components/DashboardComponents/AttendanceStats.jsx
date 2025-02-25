import React from 'react';
import { Typography, Box } from '@mui/material';

const AttendanceStats = ({ data }) => {
  if (!data) return <Typography>Loading attendance stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Event Attendance
      </Typography>
      <Typography>
        Total Events: {data.total_events || 0}
      </Typography>
      <Typography>
        Average Attendance: {Math.round(data.average_attendance_rate || 0)}%
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Attendance History:
        </Typography>
        {Array.isArray(data.attendance_history) ? (
          data.attendance_history.map((item, index) => (
            <Typography key={index}>
              {new Date(item.date).toLocaleDateString()}: {item.attendance_count} attendees
            </Typography>
          ))
        ) : (
          <Typography>No attendance history available</Typography>
        )}
      </Box>
    </Box>
  );
};

export default AttendanceStats;