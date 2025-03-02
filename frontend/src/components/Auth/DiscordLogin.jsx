// src/components/Auth/DiscordLogin.jsx
import { useState } from 'react';
import { Button, Box } from '@mui/material';

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_BACKEND_URL || window.location.origin)
  : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

const DiscordLogin = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Include current origin as redirect URL
    const authUrl = `${BACKEND_URL}/auth/discord?redirectUrl=${encodeURIComponent(window.location.origin)}`;
    console.log('Attempting to redirect to:', authUrl);
    try {
      setLoading(true);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login attempt failed:', error);
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
          '&:hover': { bgcolor: '#4752C4' },
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