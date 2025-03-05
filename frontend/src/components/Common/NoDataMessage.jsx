// src/components/common/NoDataMessage.jsx
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

const NoDataMessage = ({ 
  title, 
  message, 
  actionText = null,
  actionPath = null,
  icon = null 
}) => {
  const navigate = useNavigate();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 3,
        my: 2
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'primary.main', fontSize: '3rem' }}>
          {icon}
        </Box>
      )}
      
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {message}
      </Typography>
      
      {actionText && actionPath && (
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => navigate(actionPath)}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
};

export default NoDataMessage;