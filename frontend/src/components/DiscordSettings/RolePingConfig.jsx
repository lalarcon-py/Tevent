import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl, 
  FormGroup, 
  FormControlLabel, 
  Switch,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Stack,
  Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDiscordRoles } from '../../hooks/useDiscordRoles';
import { useGuildContext } from '../../contexts/GuildContext';
import api from '../../services/api';

const NOTIFICATION_TYPES = [
  { id: 'events', name: 'Events', description: 'Notifications for new events' },
  { id: 'storage', name: 'Storage Items', description: 'Notifications for new items added to storage' },
  { id: 'applications', name: 'Applications', description: 'Notifications for new guild applications' },
  { id: 'gear_checks', name: 'Gear Checks', description: 'Notifications for new gear check submissions' }
];

export default function RolePingConfig() {
  const theme = useTheme();
  const { guild } = useGuildContext();
  const { roles, loading: rolesLoading } = useDiscordRoles(guild?.id);
  
  const [configurations, setConfigurations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'success' });
  
  // Load existing configurations
  useEffect(() => {
    if (!guild?.id) return;
    
    const fetchConfigurations = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/guilds/${guild.id}/discord/role-ping-configs`);
        
        // Convert array to object for easier manipulation
        const configObject = {};
        
        // Initialize with default empty configurations
        NOTIFICATION_TYPES.forEach(type => {
          configObject[type.id] = {
            enabled: true,
            roleIds: []
          };
        });
        
        // Populate with actual data from API
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach(config => {
            configObject[config.type] = {
              enabled: config.enabled,
              roleIds: config.role_ids || []
            };
          });
        }
        
        setConfigurations(configObject);
      } catch (error) {
        console.error('Error loading role ping configurations:', error);
        setAlertInfo({
          open: true,
          message: 'Failed to load notification configurations',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfigurations();
  }, [guild?.id]);
  
  // Handle toggle for enabling/disabling notifications
  const handleToggleEnabled = (type) => {
    setConfigurations(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled
      }
    }));
  };
  
  // Handle toggling a specific role
  const handleToggleRole = (type, roleId) => {
    setConfigurations(prev => {
      const currentRoleIds = prev[type].roleIds || [];
      const newRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter(id => id !== roleId)
        : [...currentRoleIds, roleId];
      
      return {
        ...prev,
        [type]: {
          ...prev[type],
          roleIds: newRoleIds
        }
      };
    });
  };
  
  // Save all configurations
  const handleSave = async () => {
    if (!guild?.id) return;
    
    try {
      setSaving(true);
      
      // Convert configurations object to array for API
      const configArray = Object.entries(configurations).map(([type, config]) => ({
        type,
        enabled: config.enabled,
        role_ids: config.roleIds
      }));
      
      await api.post(`/api/guilds/${guild.id}/discord/role-ping-configs`, configArray);
      
      setAlertInfo({
        open: true,
        message: 'Notification settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving role ping configurations:', error);
      setAlertInfo({
        open: true,
        message: 'Failed to save notification settings',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Reset all configurations
  const handleReset = async () => {
    if (!guild?.id || !window.confirm('Are you sure you want to reset all notification settings?')) {
      return;
    }
    
    try {
      setSaving(true);
      
      await api.delete(`/api/guilds/${guild.id}/discord/role-ping-configs`);
      
      // Reset local state
      const resetConfigs = {};
      NOTIFICATION_TYPES.forEach(type => {
        resetConfigs[type.id] = {
          enabled: true,
          roleIds: []
        };
      });
      
      setConfigurations(resetConfigs);
      
      setAlertInfo({
        open: true,
        message: 'Notification settings have been reset',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error resetting role ping configurations:', error);
      setAlertInfo({
        open: true,
        message: 'Failed to reset notification settings',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleCloseAlert = () => {
    setAlertInfo(prev => ({ ...prev, open: false }));
  };
  
  if (loading || rolesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Role Ping Notifications
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure which Discord roles should be notified when various events occur. Users with these roles will be mentioned in the corresponding notifications.
      </Typography>
      
      {NOTIFICATION_TYPES.map((type, index) => (
        <Box key={type.id} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1">{type.name}</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={configurations[type.id]?.enabled ?? true}
                  onChange={() => handleToggleEnabled(type.id)}
                  color="primary"
                />
              }
              label="Enable"
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {type.description}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
              Roles to Ping:
            </Typography>
            
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {roles.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    No roles available. Please make sure your Discord server is properly linked.
                  </Typography>
                </Grid>
              ) : (
                roles.map(role => (
                  <Grid item key={role.id}>
                    <Chip
                      label={role.name}
                      clickable
                      onClick={() => handleToggleRole(type.id, role.id)}
                      color={configurations[type.id]?.roleIds?.includes(role.id) ? 'primary' : 'default'}
                      sx={{
                        backgroundColor: configurations[type.id]?.roleIds?.includes(role.id) 
                          ? 'primary.main' 
                          : (role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined)
                      }}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
          
          {index < NOTIFICATION_TYPES.length - 1 && (
            <Divider sx={{ my: 2 }} />
          )}
        </Box>
      ))}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={handleReset}
          disabled={saving}
        >
          Reset All
        </Button>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          Save Changes
        </Button>
      </Box>
      
      <Snackbar 
        open={alertInfo.open} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alertInfo.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
