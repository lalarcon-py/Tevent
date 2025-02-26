import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';

const AuthError = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#121212'
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: 'center',
          bgcolor: 'rgba(30, 30, 30, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Authentication Failed
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.7)' }}>
          There was a problem authenticating with Discord. Please try again.
        </Typography>
        
        <Button
          component={Link}
          to="/"
          variant="contained"
          color="primary"
          size="large"
        >
          Return to Home
        </Button>
      </Paper>
    </Box>
  );
};

export default AuthError;