// src/components/Auth/LogoutButton.jsx
import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useAuth } from '../../contexts/AuthContext';

const LogoutButton = ({ variant = 'text', color = 'inherit', ...props }) => {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = () => {
    try {
      setIsLoggingOut(true);
      console.log('Logout clicked - starting process');
      
      // Clear localStorage first
      try {
        localStorage.removeItem('guildId');
        console.log('LocalStorage cleared');
      } catch (error) {
        console.error('LocalStorage error:', error);
      }
      
      // Get backend URL
      const BACKEND_URL = process.env.NODE_ENV === 'production'
        ? (process.env.REACT_APP_BACKEND_URL || window.location.origin)
        : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');
      
      // Direct redirect to logout endpoint - no React Router
      console.log('Redirecting to logout endpoint');
      window.location.href = `${BACKEND_URL}/auth/logout`;
      
      // Note: We're using the existing endpoint first for testing
      // If that works, we can switch to the Discord-specific one
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleLogout}
      startIcon={isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <ExitToAppIcon />}
      disabled={isLoggingOut}
      {...props}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
};

export default LogoutButton;