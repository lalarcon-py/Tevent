// src/components/Billing/InactiveGuildOverlay.jsx
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const InactiveGuildOverlay = ({ daysRemaining }) => {
  const navigate = useNavigate();
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Paper
        sx={{
          maxWidth: 500,
          width: '100%',
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
        
        <Typography variant="h5" fontWeight="bold" color="error">
          Subscription Required
        </Typography>
        
        <Typography variant="body1">
          Your guild's subscription has expired. Please renew to continue using TeventGM.
        </Typography>
        
        {daysRemaining > 0 && (
          <Typography variant="body2" color="warning.main">
            Your guild data will be deleted in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} if not renewed.
          </Typography>
        )}
        
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={() => navigate('/billing')}
          sx={{ 
            mt: 2,
            py: 1.5,
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}
        >
          Renew Subscription
        </Button>
      </Paper>
    </Box>
  );
};

export default InactiveGuildOverlay;