// src/components/Auth/LogoutButton.jsx
import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useAuth } from '../../contexts/AuthContext';

const LogoutButton = ({ variant = 'text', color = 'inherit', ...props }) => {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Clear localStorage first (in case logout API fails)
      try {
        localStorage.removeItem('guildId');
        console.log('Successfully cleared localStorage');
      } catch (storageError) {
        console.warn('Failed to access localStorage:', storageError);
        // Continue with logout even if localStorage fails
      }
      
      // Call the logout function from context
      await logout();
      console.log('Logout API call completed');
      
      // Force a complete reload - this is the most reliable way to reset all state
      console.log('Reloading page to reset state...');
      window.location.reload();
    } catch (error) {
      console.error('Logout process failed:', error);
      
      // Even if the API call fails, reload to reset UI state
      console.log('Reloading page despite error...');
      window.location.reload();
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