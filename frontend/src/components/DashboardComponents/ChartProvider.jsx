import React from 'react';
import { Box } from '@mui/material';

const ChartContainer = ({ children }) => (
  <Box 
    sx={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}
  >
    {children}
  </Box>
);

export default ChartContainer;