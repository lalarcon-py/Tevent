import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Button, Typography, CircularProgress, Alert, Chip,
  Paper, Grid, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, IconButton, alpha
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import axiosInstance from '../../config/axios';

// Role ping types
const ROLE_PING_TYPES = [
  { id: 'events', name: 'Event Notifications', emoji: '📅', description: 'Pings when events are created' },
  { id: 'items', name: 'Item Notifications', emoji: '📦', description: 'Pings when items are added to storage' },
  { id: 'applications', name: 'Application Notifications', emoji: '📝', description: 'Pings when guild applications are received' },
  { id: 'gear_checks', name: 'Gear Check Notifications', emoji: '⚔️', description: 'Pings when gear checks are submitted' }
];

const RolePingConfig = ({ guildId, discordGuildId, botConnected }) => {
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discordRoles, setDiscordRoles] = useState([]);
  const [configurations, setConfigurations] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResults, setTestResults] = useState(null);

  // Fetch role ping configurations
  const fetchRolePingConfigurations = useCallback(async () => {
    if (!guildId) return;
    
    try {
      setLoading(true);
      setError('');
      console.log(`Fetching role ping configs for guild: ${guildId}`);
      
      const response = await axiosInstance.get(`/api/guilds/${guildId}/discord/role-ping-configs`);
      console.log('Received role ping configs:', response.data);
      
      // Convert array of configs to object for easier access
      const configsObj = {};
      ROLE_PING_TYPES.forEach(type => {
        configsObj[type.id] = [];
      });
      
      // Populate from API response
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(config => {
          if (config.type && config.role_ids && Array.isArray(config.role_ids)) {
            configsObj[config.type] = config.role_ids;
          }
        });
      }
      
      setConfigurations(configsObj);
    } catch (error) {
      console.error('Failed to fetch role ping configurations:', error);
      setError('Failed to load role ping settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  // Fetch Discord roles
  const fetchDiscordRoles = useCallback(async () => {
    if (!guildId) return;
    
    try {
      setRoleLoading(true);
      setError('');
      console.log(`Fetching roles for guild: ${guildId}`);
      
      const response = await axiosInstance.get(`/api/guilds/${guildId}/discord/roles`);
      console.log('Received roles response:', response.data);
      
      // Handle different response formats and ensure we have an array
      let roles = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          roles = response.data;
        } else if (Array.isArray(response.data.roles)) {
          roles = response.data.roles;
        }
      }
      
      // Filter out @everyone role and sort alphabetically
      const filteredRoles = roles
        .filter(role => role && role.name && role.name !== '@everyone')
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`Filtered ${filteredRoles.length} roles`);
      setDiscordRoles(filteredRoles);
    } catch (error) {
      console.error('Error fetching Discord roles:', error);
      setError('Failed to load Discord roles. Please try again later.');
      setDiscordRoles([]);
    } finally {
      setRoleLoading(false);
    }
  }, [guildId]);

  // Fetch data when component mounts
  useEffect(() => {
    if (botConnected && guildId) {
      fetchRolePingConfigurations();
      fetchDiscordRoles();
    }
  }, [botConnected, guildId, fetchRolePingConfigurations, fetchDiscordRoles]);

  // Add role to a notification type
  const addRole = (type, roleId) => {
    if (!roleId) return;
    
    const updatedConfigs = { ...configurations };
    
    // Check if this role is already added
    if (!updatedConfigs[type].includes(roleId)) {
      updatedConfigs[type] = [...updatedConfigs[type], roleId];
      setConfigurations(updatedConfigs);
    }
  };

  // Remove role from a notification type
  const removeRole = (type, roleId) => {
    const updatedConfigs = { ...configurations };
    updatedConfigs[type] = updatedConfigs[type].filter(id => id !== roleId);
    setConfigurations(updatedConfigs);
  };

  // Get role name by ID
  const getRoleName = (roleId) => {
    const role = discordRoles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  // Get role color by ID
  const getRoleColor = (roleId) => {
    const role = discordRoles.find(r => r.id === roleId);
    return role && role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5';
  };

  // Save role ping configurations
  const saveSettings = async () => {
    if (!guildId) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Convert configurations object to array format expected by API
      const configsArray = Object.entries(configurations).map(([type, roleIds]) => ({
        type,
        enabled: true,
        role_ids: roleIds
      }));
      
      console.log('Saving configurations:', configsArray);
      
      await axiosInstance.post(`/api/guilds/${guildId}/discord/role-ping-configs`, configsArray);
      
      setSuccess('Role ping configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving role ping config:', err);
      setError('Failed to save role ping configuration: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Test the configuration
  const testRolePings = async () => {
    if (!guildId) return;
    
    try {
      setTestResults(null);
      setSaving(true);
      setError('');
      
      const response = await axiosInstance.post(`/api/discord-bot/test-role-pings`, {
        guildId,
        discordGuildId
      });
      
      setTestResults(response.data.results);
      setTimeout(() => setTestResults(null), 10000);
    } catch (err) {
      console.error('Error testing role pings:', err);
      setError('Failed to test role ping configuration: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (!botConnected) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        Discord bot is not connected. Connect a Discord server to use role ping configuration.
      </Alert>
    );
  }

  if (loading || roleLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 4, mb: 5, borderRadius: 2, backgroundColor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
        <NotificationsActiveIcon sx={{ mr: 1.5, color: '#5865F2', opacity: 0.85 }} />
        Role Ping Settings
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure which Discord roles should be pinged for different notification types.
      </Typography>
      
      {/* Role selection/loading indicator */}
      {discordRoles.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No roles found in your Discord server. Please create at least one role first.
        </Alert>
      ) : (
        // Role selection for each notification type
        ROLE_PING_TYPES.map((type) => {
          const roleIds = configurations[type.id] || [];
          
          return (
            <Card 
              key={type.id} 
              elevation={0}
              sx={{ 
                mb: 3,
                borderLeft: roleIds.length > 0 ? '3px solid' : 'none',
                borderColor: roleIds.length > 0 ? 'primary.main' : 'transparent',
                backgroundColor: roleIds.length > 0 ? alpha('#5865F2', 0.03) : alpha('#f5f5f5', 0.5),
                transition: 'all 0.2s'
              }}
            >
              <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {type.emoji} {type.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {roleIds.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No roles will be pinged
                        </Typography>
                      ) : (
                        roleIds.map(roleId => (
                          <Chip
                            key={roleId}
                            label={getRoleName(roleId)}
                            onDelete={() => removeRole(type.id, roleId)}
                            sx={{ 
                              backgroundColor: getRoleColor(roleId),
                              color: parseInt(getRoleColor(roleId).substring(1), 16) > 0x888888 ? '#000' : '#fff',
                              borderRadius: '16px',
                              fontWeight: 400
                            }}
                          />
                        ))
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Add Role</InputLabel>
                        <Select
                          value=""
                          label="Add Role"
                          onChange={(e) => addRole(type.id, e.target.value)}
                        >
                          {discordRoles.map((role) => (
                            <MenuItem 
                              key={role.id} 
                              value={role.id}
                              disabled={roleIds.includes(role.id)}
                            >
                              {role.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <IconButton 
                        color="error" 
                        onClick={() => setConfigurations({...configurations, [type.id]: []})}
                        disabled={roleIds.length === 0}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })
      )}
      
      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={saveSettings}
          disabled={saving || discordRoles.length === 0}
          size="large"
          sx={{ 
            backgroundColor: '#5865F2', 
            '&:hover': { backgroundColor: '#4752C4' },
            boxShadow: 'none',
            textTransform: 'none',
            px: 3
          }}
        >
          {saving ? <CircularProgress size={24} /> : 'Save Role Pings'}
        </Button>
        
        <Button 
          variant="outlined"
          onClick={testRolePings}
          disabled={saving || discordRoles.length === 0}
          sx={{ 
            borderColor: '#5865F2', 
            color: '#5865F2',
            textTransform: 'none',
            '&:hover': { borderColor: '#4752C4', backgroundColor: alpha('#5865F2', 0.04) },
            boxShadow: 'none',
            px: 3
          }}
        >
          Test Role Pings
        </Button>
      </Box>
      
      {testResults && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          {Object.entries(testResults).map(([type, result]) => (
            <Alert 
              key={type} 
              severity={result.success ? "success" : "error"}
              sx={{ mb: 1 }}
            >
              {type}: {result.success ? "Message sent successfully" : result.error}
            </Alert>
          ))}
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Paper>
  );
};

export default RolePingConfig;