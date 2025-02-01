import { useState } from 'react';
import { Button, Box } from '@mui/material';

const DiscordLogin = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      // First check if the backend is accessible
      const response = await fetch('http://localhost:5000', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.location.href = 'http://localhost:5000/auth/discord';
      } else {
        console.error('Backend server not responding');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      setLoading(false);
    }
  };

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