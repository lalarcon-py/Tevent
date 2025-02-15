import { useState } from 'react';
import { Button, Box } from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL;

const DiscordLogin = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('Login attempt started');
    console.log('API_URL:', API_URL);

    try {
      setLoading(true);
      console.log('Redirecting to Discord auth at:', `${API_URL}/auth/discord`);
      window.location.href = `${API_URL}/auth/discord`;
    } catch (error) {
      console.error('Login attempt failed with error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setLoading(false);
    }
  };

  console.log('Component rendered with API_URL:', API_URL);

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      height: '100%'
    }}>
      <Button
        variant="contained"
        onClick={handleLogin}
        disabled={loading}
        sx={{
          bgcolor: '#5865F2',
          '&:hover': { 
            bgcolor: '#4752C4'
          },
          py: 1.5,
          px: 4,
          fontSize: '1rem',
          fontWeight: 500,
          textTransform: 'none',
          borderRadius: '3px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          '&:disabled': {
            bgcolor: '#4752C4',
            opacity: 0.7
          }
        }}
      >
        {loading ? 'Connecting...' : 'Login with Discord'}
      </Button>
    </Box>
  );
};

export default DiscordLogin;