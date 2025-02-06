// CombatStats.jsx
import React from 'react';
import { Typography, Box, LinearProgress } from '@mui/material';

const CombatStats = ({ data }) => {
  if (!data) return <Typography>Loading combat stats...</Typography>;

  // Process data into CP ranges
  const processData = () => {
    const ranges = [
      { range: '<1000', min: 0, max: 999 },
      { range: '1000-2000', min: 1000, max: 1999 },
      { range: '2000-3000', min: 2000, max: 2999 },
      { range: '3000-4000', min: 3000, max: 3999 },
      { range: '4000+', min: 4000, max: Infinity }
    ];

    const distribution = ranges.map(range => ({
      range: range.range,
      count: data.users?.filter(user => 
        user.combat_power >= range.min && user.combat_power <= range.max
      ).length || 0
    }));

    return distribution;
  };

  const validCPs = data.users?.map(u => u.combat_power).filter(cp => cp != null) || [];
  const averageCP = validCPs.length ? Math.round(validCPs.reduce((a, b) => a + b, 0) / validCPs.length) : 0;
  const maxCP = validCPs.length ? Math.max(...validCPs) : 0;
  const minCP = validCPs.length ? Math.min(...validCPs) : 0;

  const cpDistribution = processData();
  const maxCount = Math.max(...cpDistribution.map(d => d.count));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Combat Power Statistics
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Typography>Average CP: {averageCP}</Typography>
        <Typography>Max CP: {maxCP}</Typography>
        <Typography>Min CP: {minCP}</Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        {cpDistribution.map((item, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{item.range}</Typography>
              <Typography>{item.count} players</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(item.count / maxCount) * 100}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(136, 132, 216, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#8884d8',
                  borderRadius: 5
                }
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CombatStats;