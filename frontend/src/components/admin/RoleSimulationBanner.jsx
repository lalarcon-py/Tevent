// src/components/admin/RoleSimulationBanner.jsx
import React from 'react';
import { Box, Alert, IconButton, Typography, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';

const RoleSimulationBanner = () => {
  const { simulatedRole, clearSimulation, isSimulating } = useSimulatedRole();
  
  if (!isSimulating) return null;
  
  return (
    <Alert 
      severity="info"
      icon={<VisibilityIcon />}
      sx={{ 
        position: 'fixed', 
        top: '64px', 
        left: 0, 
        right: 0, 
        zIndex: 1100,
        py: 0.5,
        borderRadius: 0,
        bgcolor: 'rgba(25, 118, 210, 0.95)',
        backdropFilter: 'blur(4px)'
      }}
      action={
        <IconButton
          color="inherit"
          size="small"
          onClick={clearSimulation}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <Typography variant="body2" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
        Role Simulation Active: Viewing as 
        <Chip 
          label={simulatedRole} 
          size="small" 
          sx={{ mx: 1, bgcolor: 'rgba(255, 255, 255, 0.2)' }}
        />
        (Admin Portal only - for testing purposes)
      </Typography>
    </Alert>
  );
};

export default RoleSimulationBanner;