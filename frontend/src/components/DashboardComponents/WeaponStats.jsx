import React from 'react';
import { Typography, Box } from '@mui/material';

const WeaponStats = ({ data }) => {
  if (!data) return <Typography>Loading weapon stats...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Weapon Combinations
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Typography>Total Builds: {data.total_builds}</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.weapon_combinations?.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ minWidth: 150 }}>{item.combination}</Typography>
            <Box 
              sx={{ 
                height: 20, 
                backgroundColor: '#8884d8',
                width: `${(item.count / Math.max(...data.weapon_combinations.map(d => d.count))) * 100}%`
              }} 
            />
            <Typography>{item.count}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default WeaponStats;