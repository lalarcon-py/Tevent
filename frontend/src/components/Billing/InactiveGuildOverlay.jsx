// src/components/Billing/InactiveGuildOverlay.jsx
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

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
        bgcolor: 'rgba(0, 0, 0, 0.85)',
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
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
        }}
      >
        <Typography variant="h5" gutterBottom color="error">
          Guild Inactive
        </Typography>
        
        <Typography variant="body1" paragraph>
          Your guild is currently inactive due to an expired subscription.
        </Typography>
        
        {daysRemaining > 0 ? (
          <Typography variant="body2" color="warning.main" paragraph>
            Your guild data will be permanently deleted in {daysRemaining} days if not reactivated.
          </Typography>
        ) : (
          <Typography variant="body2" color="error" paragraph>
            Your guild is scheduled for deletion. Reactivate now to prevent data loss!
          </Typography>
        )}
        
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate('/billing')}
          sx={{ mt: 2 }}
        >
          Renew Subscription
        </Button>
      </Paper>
    </Box>
  );
};

export default InactiveGuildOverlay;