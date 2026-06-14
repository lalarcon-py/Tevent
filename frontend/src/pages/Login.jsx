// src/pages/Login.jsx
import React from 'react';
import { Box, Button, Typography } from '@mui/material';

import API_URL from '../config/apiUrl';

const Login = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: 'white'
    }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Welcome to Guild Manager
      </Typography>
      <Typography variant="body1" sx={{ mb: 6, maxWidth: 600, textAlign: 'center' }}>
        Please login with Discord to access your guild management dashboard.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        href={`${API_URL}/auth/discord`}
        size="large"
        sx={{
          py: 1.5,
          px: 4,
          fontSize: '1.1rem',
          bgcolor: '#5865F2',
          '&:hover': {
            bgcolor: '#4752c4'
          }
        }}
      >
        Login with Discord
      </Button>
    </Box>
  );
};

export default Login;