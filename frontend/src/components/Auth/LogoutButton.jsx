// src/components/Auth/LogoutButton.jsx
import React from 'react';
import { Button } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : process.env.REACT_APP_API_URL;

const LogoutButton = ({ variant = 'text', color = 'inherit', ...props }) => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include'
      });
      
      // Clear any local storage if needed
      localStorage.removeItem('guildId');
      
      // Redirect to home page
      navigate('/');
      // Force reload to clear any in-memory state
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <Button
      variant={variant}
      color={color}
      onClick={handleLogout}
      startIcon={<ExitToAppIcon />}
      {...props}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;