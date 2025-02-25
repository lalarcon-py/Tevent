import React from 'react';
import { Typography, Box } from '@mui/material';

const WeaponStats = ({ data }) => {
  if (!data) return <Typography>Loading weapon stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Weapon Combinations
      </Typography>
      <Typography>
        Total Builds: {data.total_builds || 0}
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        {Array.isArray(data.weapon_combinations) ? (
          data.weapon_combinations.map((item, index) => (
            <Typography key={index}>
              {item.combination || 'Unknown'}: {item.count || 0}
            </Typography>
          ))
        ) : (
          <Typography>No weapon data available</Typography>
        )}
      </Box>
    </Box>
  );
};

export default WeaponStats;