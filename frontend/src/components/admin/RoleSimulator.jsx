// src/components/admin/RoleSimulator.jsx
import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, FormControl, Select, MenuItem, 
  Box, Button, Alert, Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import { useAuth } from '../../contexts/AuthContext';

const RoleSimulator = () => {
  const { simulatedRole, setSimulatedRole, clearSimulation, isSimulating } = useSimulatedRole();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(simulatedRole || 'Guild Member');
  
  // Reset selected role when simulation changes
  useEffect(() => {
    if (!isSimulating) {
      setSelectedRole('Guild Member');
    } else {
      setSelectedRole(simulatedRole);
    }
  }, [isSimulating, simulatedRole]);

  const handleChange = (event) => {
    const role = event.target.value;
    setSelectedRole(role);
  };
  
  const startSimulation = () => {
    setSimulatedRole(selectedRole);
  };
  
  const getRoleIcon = (role) => {
    switch(role) {
      case 'Guild Master':
        return <AdminPanelSettingsIcon sx={{ color: '#ffd700' }} />;
      case 'Guild Advisor':
      case 'Guild Guardian':
        return <SecurityIcon sx={{ color: '#90caf9' }} />;
      default:
        return <PersonIcon sx={{ color: '#aaa' }} />;
    }
  };
  
  return (
    <Paper sx={{ p: 2, mb: 3, position: 'relative', overflow: 'hidden' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AdminPanelSettingsIcon sx={{ color: '#3b82f6' }} />
        Role Simulator
      </Typography>
      
      {isSimulating && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            You are currently viewing the app as: 
            <Chip 
              label={simulatedRole}
              size="small"
              icon={getRoleIcon(simulatedRole)}
              sx={{ ml: 1 }}
            />
          </Typography>
        </Alert>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        See how the application appears to users with different permission levels.
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={selectedRole}
            onChange={handleChange}
            displayEmpty
          >
            <MenuItem value="Guild Member">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" />
                <span>Guild Member</span>
              </Box>
            </MenuItem>
            <MenuItem value="Guild Guardian">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" />
                <span>Guild Guardian</span>
              </Box>
            </MenuItem>
            <MenuItem value="Guild Advisor">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" />
                <span>Guild Advisor</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
        
        {isSimulating ? (
          <Button 
            variant="outlined" 
            color="error" 
            onClick={clearSimulation}
            size="small"
          >
            Stop Simulation
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={startSimulation}
            size="small"
          >
            View As {selectedRole}
          </Button>
        )}
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Your actual role: {user?.role || 'Unknown'}
      </Typography>
      
      {/* Background decoration */}
      <Box sx={{ 
        position: 'absolute', 
        top: -20, 
        right: -20, 
        opacity: 0.05, 
        fontSize: '8rem',
        transform: 'rotate(15deg)',
        pointerEvents: 'none'
      }}>
        {getRoleIcon(selectedRole)}
      </Box>
    </Paper>
  );
};

export default RoleSimulator;