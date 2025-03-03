// src/components/Auth/LogoutButton.jsx
import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LogoutButton = ({ variant = 'text', color = 'inherit', ...props }) => {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // First, clear localStorage safely
      try {
        localStorage.removeItem('guildId');
        console.log('Successfully cleared localStorage');
      } catch (storageError) {
        console.warn('Failed to access localStorage:', storageError);
      }
      
      // Navigate to a public page BEFORE making the API call
      // This prevents protected route navigation errors
      navigate('/');
      
      // Then call the logout function from context
      await logout();
      console.log('Logout API call completed');
      
      // Full page reload to reset all application state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout process failed:', error);
      
      // Even if the API call fails, ensure user is redirected to home
      window.location.href = '/';
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