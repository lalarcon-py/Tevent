import React from 'react';
import { Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Custom hamburger menu button that doesn't use button elements
// to avoid any form submission behavior
const MobileMenuToggle = ({ onClick }) => {
  const handleClick = (e) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Call the onClick handler if provided
    if (onClick) {
      onClick(e);
    }
    
    // Dispatch a custom event to open the mobile menu
    const event = new CustomEvent('open-mobile-menu');
    document.dispatchEvent(event);
    
    return false;
  };
  
  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
        color: 'white',
        mr: 2,
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        },
        '&:active': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)'
        }
      }}
      aria-label="menu"
      role="button"
      tabIndex={0}
    >
      <MenuIcon />
    </Box>
  );
};

export default MobileMenuToggle;