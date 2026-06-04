// Updated DiscordSettingsPage.jsx component with enhanced channel reading and role simulation

import React, { useState, useEffect } from 'react';
import RolePingConfig from '../components/discord/RolePingConfig';
import { useParams } from 'react-router-dom';
import { 
  Box, Button, Container, FormControl, Grid, 
  MenuItem, Select, Typography, Alert, CircularProgress,
  Snackbar, InputLabel, Switch, FormControlLabel,
  Paper, Card, CardContent, alpha
} from '@mui/material';
import ConnectedTvIcon from '@mui/icons-material/ConnectedTv';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TuneIcon from '@mui/icons-material/Tune';
import { useGuild } from '../contexts/GuildContext';
import { useSimulatedRole } from '../contexts/SimulatedRoleContext'; // Added import
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';

// Channel configuration options - matches the requested channels
const CHANNEL_TYPES = [
  { id: 'events', name: 'Event Notification Channel', description: 'Receive notifications about new events and reminders' },
  { id: 'storage', name: 'Item Storage Channel', description: 'Updates when new items are added to storage' },
  { id: 'approvals', name: 'Item Storage Approval/Denial Channel', description: 'Channel for approving/denying item requests' },
  { id: 'teams', name: 'Static Teams Channel', description: 'Updates about team compositions and changes' },
  { id: 'parties', name: 'Event Parties Channel', description: 'Party announcements and assignments for events' },
  { id: 'applications', name: 'Applications Channel', description: 'New guild application notifications' },
  { id: 'logs', name: 'Log Channel', description: 'User actions and approval/denial logs' }
];

const DiscordSettingsPage = () => {
  const { guildId: urlGuildId } = useParams();
  const currentGuildId = urlGuildId || localStorage.getItem('guildId');
  
  const { guildRole } = useGuild();
  const { isAuthenticated } = useAuth();
  const { simulatedRole } = useSimulatedRole(); // admin portal usage of simulated role
  const [isGuildMaster, setIsGuildMaster] = useState(false);
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [channelLoading, setChannelLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discordGuilds, setDiscordGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [botConnected, setBotConnected] = useState(false);
  const [testResults, setTestResults] = useState(null);
  
  // Fetch Discord connection data
  useEffect(() => {
    if (!currentGuildId) {
      console.error('No guild ID available for Discord settings');
      setError('No guild selected. Please select a guild first.');
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First, fetch guild details to verify permissions
        const guildResponse = await axiosInstance.get(`/api/guilds/${currentGuildId}`);
        console.log("Guild API response:", guildResponse.data);
        
        // Check if current user is guild master from response
        const userRoleFromAPI = guildResponse.data.userRole;
        console.log("Server-reported user role:", userRoleFromAPI);
        
        // Use simulated role if available, otherwise use actual role (admin portal feature)
        const effectiveRole = simulatedRole || userRoleFromAPI;
        setIsGuildMaster(effectiveRole === 'Guild Master');
        
        if (effectiveRole !== 'Guild Master') {
          setLoading(false);
          return;
        }
        
        try {
          const mappingResponse = await axiosInstance.get(`/api/discord-bot/guild-mapping/${currentGuildId}`);
          console.log('Discord mapping response:', mappingResponse.data);
          
          setBotConnected(mappingResponse.data.connected);
          
          if (mappingResponse.data.connected) {
            setSelectedGuild(mappingResponse.data.discordGuildId);
            
            setDiscordGuilds([{
              id: mappingResponse.data.discordGuildId,
              name: "Connected Discord Server"
            }]);
            
            await fetchDiscordChannels(currentGuildId, mappingResponse.data.discordGuildId);
            
            // Try to get existing configurations
            try {
              const configResponse = await axiosInstance.get(`/api/discord-bot/channel-config?guildId=${currentGuildId}`);
              if (configResponse.data && configResponse.data.configurations) {
                setConfigurations(configResponse.data.configurations);
              }
            } catch (configError) {
              console.warn('Could not fetch channel configurations:', configError);
            }
          }
        } catch (mappingError) {
          console.error('Error checking Discord connection:', mappingError);
          setBotConnected(false);
        }
      } catch (error) {
        console.error('Failed to fetch guild data:', error);
        
        if (error.response) {
          if (error.response.status === 403) {
            setIsGuildMaster(false);
            setError('You do not have permission to access Discord settings.');
          } else {
            setError(error.response.data?.error || 'Failed to load Discord settings. Please try again later.');
          }
        } else {
          setError('Failed to load Discord settings. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentGuildId, simulatedRole]);
  
  const fetchDiscordChannels = async (guildId, discordGuildId) => {
    try {
      setChannelLoading(true);
      
      // Call API to get Discord channels
      const response = await axiosInstance.get(
        `/api/discord-bot/channels?guildId=${guildId}&discordGuildId=${discordGuildId}`
      );
      
      // Filter to ONLY include text channels (type 0)
      const textChannels = response.data.filter(channel => channel.type === 0);
      
      // Sort channels alphabetically
      const sortedChannels = textChannels.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`Fetched ${sortedChannels.length} text channels`);
      setChannels(sortedChannels);
    } catch (error) {
      console.error('Error fetching Discord channels:', error);
      setError('Failed to load Discord channels. Please try again later.');
      
      setChannels([]);
    } finally {
      setChannelLoading(false);
    }
  };
  
  const handleGuildChange = async (discordGuildId) => {
    try {
      setSelectedGuild(discordGuildId);
      
      await fetchDiscordChannels(currentGuildId, discordGuildId);
      
      try {
        const configResponse = await axiosInstance.get(`/api/discord-bot/channel-config?guildId=${currentGuildId}`);
        if (configResponse.data && configResponse.data.configurations) {
          setConfigurations(configResponse.data.configurations);
        }
      } catch (configError) {
        console.warn('Could not fetch channel configurations:', configError);
      }
    } catch (err) {
      console.error('Error changing Discord server:', err);
      setError('Failed to load Discord channels for the selected server');
    }
  };
  
  // Handle channel selection for a notification type
  const handleChannelChange = (type, channelId) => {
    const updatedConfigs = [...configurations];
    const existingConfig = updatedConfigs.find(c => c.channel_type === type);
    
    if (existingConfig) {
      existingConfig.channel_id = channelId;
    } else {
      updatedConfigs.push({
        channel_type: type,
        channel_id: channelId,
        enabled: true
      });
    }
    
    setConfigurations(updatedConfigs);
  };
  
  // Toggle enabled status for a channel type
  const handleToggleEnabled = (type) => {
    const updatedConfigs = [...configurations];
    const existingConfig = updatedConfigs.find(c => c.channel_type === type);
    
    if (existingConfig) {
      existingConfig.enabled = !existingConfig.enabled;
      setConfigurations(updatedConfigs);
    }
  };
  
  // Save channel configs
  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await axiosInstance.post(`/api/discord-bot/channel-config`, {
        guildId: currentGuildId,
        discordGuildId: selectedGuild,
        configurations
      });
      
      setSuccess('Channel configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving channel config:', err);
      setError('Failed to save channel configuration: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };
  
  // Test the configuration
  const testConfiguration = async () => {
    try {
      setTestResults(null);
      setSaving(true);
      setError('');
      
      const response = await axiosInstance.post(`/api/discord-bot/test-channels`, {
        guildId: currentGuildId,
        discordGuildId: selectedGuild
      });
      
      setTestResults(response.data.results);
      setTimeout(() => setTestResults(null), 10000);
    } catch (err) {
      console.error('Error testing channels:', err);
      setError('Failed to test channel configuration: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };
  
  // Connect Discord bot
  const connectDiscordBot = () => {
    axiosInstance.get(`/api/guilds/${currentGuildId}/settings`)
      .then(response => {
        const joinCode = response.data.joinCode;
        
        // Create Discord OAuth URL to add bot
        const discordClientId = process.env.REACT_APP_DISCORD_CLIENT_ID;
        const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&permissions=2147485696&scope=bot%20applications.commands`;
        
        // Open Discord authorization in new tab
        window.open(discordUrl, '_blank');
        
        // Show instructions for connecting the bot
        setTimeout(() => {
          alert(`After adding the bot to your Discord server, use this command:\n\n/link-guild join_code:${joinCode}`);
        }, 500);
      })
      .catch(error => {
        console.error('Failed to get join code:', error);
        setError('Could not retrieve Discord integration information');
      });
  };
  
  // If not Guild Master, show access denied message
  if (!isGuildMaster && !loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          Access Denied: Only Guild Masters can configure Discord integration settings.
          {simulatedRole && (
            <Typography sx={{ mt: 1 }}>
              Currently simulating role: <strong>{simulatedRole}</strong> 
              (this role doesn't have access to Discord settings)
            </Typography>
          )}
        </Alert>
      </Container>
    );
  }
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 500 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ConnectedTvIcon sx={{ mr: 2, fontSize: 32, color: '#5865F2', opacity: 0.85 }} />
          Discord Integration Settings
          {simulatedRole && (
            <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', ml: 2, opacity: 0.8 }}>
              Simulating role: {simulatedRole}
            </Typography>
          )}
        </Box>
      </Typography>
      
      {!botConnected && (
        <Paper elevation={0} sx={{ p: 4, mb: 5, backgroundColor: alpha('#5865F2', 0.04), borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Connect to Discord
          </Typography>
          <Typography paragraph>
            Your guild isn't connected to Discord yet. Connecting allows you to receive notifications, manage approvals, and interact with your guild directly from Discord.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<ConnectedTvIcon />}
            onClick={connectDiscordBot}
            sx={{ mt: 1 }}
          >
            Connect Discord Server
          </Button>
        </Paper>
      )}
      
      {botConnected && (
        <>
          <RolePingConfig 
            guildId={currentGuildId} 
            discordGuildId={selectedGuild} 
            botConnected={botConnected} 
          />
          
          <Paper elevation={0} sx={{ p: 4, mb: 5, backgroundColor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <NotificationsIcon sx={{ mr: 1 }} />
              Channel Notification Settings
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure which Discord channels should receive different types of notifications and interactions.
            </Typography>
            
            {/* Channel selection/loading indicator */}
            {channelLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={30} />
                <Typography sx={{ ml: 2 }}>Loading channels...</Typography>
              </Box>
            ) : channels.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No text channels found in your Discord server. Please create at least one text channel first.
              </Alert>
            ) : (
              // Channel selection for each notification type
              CHANNEL_TYPES.map((type) => {
                const config = configurations.find(c => c.channel_type === type.id);
                const channelId = config?.channel_id || '';
                const enabled = config?.enabled !== false; // Default to true if not specified
                
                return (
                  <Card 
                  key={type.id} 
                  elevation={0}
                  sx={{ 
                  mb: 3,
                  borderLeft: enabled ? '3px solid' : 'none',
                  borderColor: enabled ? 'primary.main' : 'transparent',
                  backgroundColor: enabled ? alpha('#5865F2', 0.03) : alpha('#f5f5f5', 0.5),
                    opacity: enabled ? 1 : 0.8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {type.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {type.description}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Channel</InputLabel>
                            <Select
                              value={channelId}
                              onChange={(e) => handleChannelChange(type.id, e.target.value)}
                              label="Channel"
                              disabled={!enabled}
                            >
                              <MenuItem value="">
                                <em>None</em>
                              </MenuItem>
                              {channels.map((channel) => (
                                <MenuItem key={channel.id} value={channel.id}>
                                  #{channel.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={enabled}
                                onChange={() => handleToggleEnabled(type.id)}
                                color="primary"
                              />
                            }
                            label="Enabled"
                          />
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
                disabled={saving || channelLoading}
                size="large"
                sx={{ 
                  backgroundColor: '#5865F2', 
                  '&:hover': { backgroundColor: '#4752C4' },
                  boxShadow: 'none',
                  textTransform: 'none',
                  px: 3
                }}
              >
                {saving ? <CircularProgress size={24} /> : 'Save Settings'}
              </Button>
              
              <Button 
                variant="outlined"
                onClick={testConfiguration}
                disabled={saving || channelLoading}
                sx={{ 
                  borderColor: '#5865F2', 
                  color: '#5865F2',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#4752C4', backgroundColor: alpha('#5865F2', 0.04) },
                  boxShadow: 'none',
                  px: 3
                }}
              >
                Test Notifications
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
          </Paper>
          
          <Paper elevation={0} sx={{ p: 4, borderRadius: 2, backgroundColor: alpha('#f5f5f5', 0.3) }}>
            <Typography variant="h6" gutterBottom>
              Discord Integration Features
            </Typography>
            
            <Typography paragraph>
              Once configured, your Discord integration enables these features:
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Automated Notifications
                </Typography>
                <ul>
                  <li>New event announcements and reminders</li>
                  <li>Guild storage updates when items are added</li>
                  <li>Team assignments for events</li>
                  <li>Application status changes</li>
                </ul>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Interactive Commands
                </Typography>
                <ul>
                  <li>Approve/deny item requests with reaction buttons</li>
                  <li>Sign up for events with role reactions</li>
                  <li>View guild information and member status</li>
                  <li>Accept/reject applications</li>
                </ul>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DiscordSettingsPage;