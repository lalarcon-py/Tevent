import React from 'react';
import { Typography, Box } from '@mui/material';

const MembershipStats = ({ data }) => {
  if (!data) return <Typography>Loading membership stats...</Typography>;

  // Simple text-only version
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Membership Overview
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <Typography>Total Members: {data.total_members || 0}</Typography>
        <Typography>Active Members: {data.active_members || 0}</Typography>
        <Typography>New Members (30d): {data.new_members_30d || 0}</Typography>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Role Distribution:
      </Typography>
      {Object.entries(data.role_distribution || {}).map(([role, count]) => (
        <Typography key={role}>
          {role}: {count}
        </Typography>
      ))}
    </Box>
  );
};

export default MembershipStats;