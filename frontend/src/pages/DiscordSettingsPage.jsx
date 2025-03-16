import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, Button, Container, FormControl, Grid, 
  MenuItem, Select, Typography, Alert, CircularProgress,
  Snackbar, InputLabel, Divider, Switch, FormControlLabel,
  Paper, Card, CardContent
} from '@mui/material';
import axios from 'axios';
import ConnectedTvIcon from '@mui/icons-material/ConnectedTv';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TuneIcon from '@mui/icons-material/Tune';
import { useGuild } from '../contexts/GuildContext';
import axiosInstance from '../config/axios';

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
  // Get guildId from URL or localStorage
  const { guildId: urlGuildId } = useParams();
  const currentGuildId = urlGuildId || localStorage.getItem('guildId');
  
  const { guildRole } = useGuild();
  
  // Debug information for troubleshooting
  const [debugInfo, setDebugInfo] = useState({
    guildId: currentGuildId,
    guildRole: null,
    discordConnected: false,
    apiEndpoints: {}
  });
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discordGuilds, setDiscordGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [botConnected, setBotConnected] = useState(false);
  const [testResults, setTestResults] = useState(null);
  
  // Check if user is Guild Master
  const isGuildMaster = guildRole === 'Guild Master';
  
  // Fetch Discord connection data
  useEffect(() => {
    // Update debug info
    setDebugInfo({
      guildId: currentGuildId,
      guildRole: guildRole,
      discordConnected: botConnected,
      apiEndpoints: {
        status: `/api/discord-bot/status?guildId=${currentGuildId}`,
        guildMapping: `/api/discord-bot/guild-mapping/${currentGuildId}`,
        servers: `/api/discord-setup/servers?guildId=${currentGuildId}`,
        channelConfig: `/api/discord-setup/channel-config?guildId=${currentGuildId}`
      }
    });
    
    if (!currentGuildId) {
      console.error('No guild ID available for Discord settings');
      setError('No guild selected. Please select a guild first.');
      setLoading(false);
      return;
    }
    
    if (!isGuildMaster) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get Discord connection status using the direct guild-mapping endpoint
        try {
          const mappingResponse = await axiosInstance.get(`/api/discord-bot/guild-mapping/${currentGuildId}`);
          console.log('Discord mapping response:', mappingResponse.data);
          
          setBotConnected(mappingResponse.data.connected);
          
          if (mappingResponse.data.connected) {
            // Set selected Discord guild
            setSelectedGuild(mappingResponse.data.discordGuildId);
            
            // Get Discord server info - falling back to simpler approach for now
            setDiscordGuilds([{
              id: mappingResponse.data.discordGuildId,
              name: "Connected Discord Server"
            }]);
            
            // Try to get channels - simplified for now
            try {
              const channelsResponse = await axiosInstance.get(
                `/api/discord-bot/channels?guildId=${currentGuildId}&discordGuildId=${mappingResponse.data.discordGuildId}`
              );
              
              if (channelsResponse.data && Array.isArray(channelsResponse.data)) {
                setChannels(channelsResponse.data);
              } else {
                // Fallback to show at least something
                setChannels([
                  { id: 'general', name: 'general', type: 0 },
                  { id: 'announcements', name: 'announcements', type: 0 }
                ]);
              }
            } catch (channelsError) {
              console.warn('Could not fetch Discord channels:', channelsError);
              // Fallback channels for UI testing
              setChannels([
                { id: 'general', name: 'general', type: 0 },
                { id: 'announcements', name: 'announcements', type: 0 }
              ]);
            }
            
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
      } catch (err) {
        console.error('Error fetching Discord data:', err);
        setError('Failed to load Discord settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentGuildId, isGuildMaster, guildRole, botConnected]);
  
  // Handle Discord server selection change
  const handleGuildChange = async (discordGuildId) => {
    try {
      setSelectedGuild(discordGuildId);
      setLoading(true);
      
      // Get channels for the selected Discord server
      try {
        const channelsResponse = await axiosInstance.get(
          `/api/discord-bot/channels?guildId=${currentGuildId}&discordGuildId=${discordGuildId}`
        );
        
        if (channelsResponse.data && Array.isArray(channelsResponse.data)) {
          setChannels(channelsResponse.data);
        } else {
          setChannels([
            { id: 'general', name: 'general', type: 0 },
            { id: 'announcements', name: 'announcements', type: 0 }
          ]);
        }
      } catch (channelsError) {
        console.warn('Could not fetch Discord channels:', channelsError);
        setChannels([
          { id: 'general', name: 'general', type: 0 },
          { id: 'announcements', name: 'announcements', type: 0 }
        ]);
      }
      
      // Get current channel configurations
      try {
        const configResponse = await axiosInstance.get(`/api/discord-bot/channel-config?guildId=${currentGuildId}`);
        if (configResponse.data && configResponse.data.configurations) {
          setConfigurations(configResponse.data.configurations);
        }
      } catch (configError) {
        console.warn('Could not fetch channel configurations:', configError);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError('Failed to load Discord channels');
    } finally {
      setLoading(false);
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
  
  // Save channel configurations
  const saveSettings = async () => {
    try {
      setSaving(true);
      
      await axiosInstance.post(`/api/discord-bot/channel-config`, {
        guildId: currentGuildId,
        discordGuildId: selectedGuild,
        configurations
      });
      
      setSuccess('Channel configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving channel config:', err);
      setError('Failed to save channel configuration');
    } finally {
      setSaving(false);
    }
  };
  
  // Test the configuration
  const testConfiguration = async () => {
    try {
      setTestResults(null);
      setSaving(true);
      
      const response = await axiosInstance.post(`/api/discord-bot/test-channels`, {
        guildId: currentGuildId,
        discordGuildId: selectedGuild
      });
      
      setTestResults(response.data.results);
      setTimeout(() => setTestResults(null), 10000);
    } catch (err) {
      console.error('Error testing channels:', err);
      setError('Failed to test channel configuration');
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
  
  // If we have a critical error, show it prominently
  if (error && !loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => window.location.href = '/dashboard'}
          >
            Return to Dashboard
          </Button>
        </Box>
        
        {/* Show debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6">Debug Information</Typography>
            <pre style={{ overflow: 'auto', background: '#f5f5f5', padding: '10px' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </Paper>
        )}
      </Container>
    );
  }
  
  // If not Guild Master, show access denied message
  if (!isGuildMaster) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          Access Denied: Only Guild Masters can configure Discord integration settings.
        </Alert>
      </Container>
    );
  }
  
  if (loading && !channels.length) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // Simplified view for initial development and testing
  if (process.env.NODE_ENV === 'development' && (!botConnected || channels.length === 0)) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Discord Integration Settings
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Debug Information</Typography>
          <pre style={{ overflow: 'auto', background: '#f5f5f5', padding: '10px' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </Paper>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Discord Connection Status</Typography>
          <Typography paragraph>
            Discord connection status: {botConnected ? '✅ Connected' : '❌ Not connected'}
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={connectDiscordBot}
          >
            Connect Discord Bot
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ConnectedTvIcon sx={{ mr: 1, fontSize: 35, color: '#5865F2' }} />
        Discord Integration Settings
      </Typography>
      
      {!botConnected && (
        <Paper sx={{ p: 3, mb: 4, backgroundColor: 'rgba(144, 202, 249, 0.08)', borderRadius: 2 }}>
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
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TuneIcon sx={{ mr: 1 }} />
              Discord Server Configuration
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
              <InputLabel>Select Discord Server</InputLabel>
              <Select
                value={selectedGuild || ''}
                onChange={(e) => handleGuildChange(e.target.value)}
                label="Select Discord Server"
              >
                {discordGuilds.map((server) => (
                  <MenuItem key={server.id} value={server.id}>
                    {server.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedGuild && (
              <>
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <NotificationsIcon sx={{ mr: 1 }} />
                  Channel Notification Settings
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure which Discord channels should receive different types of notifications and interactions.
                </Typography>
                
                {CHANNEL_TYPES.map((type) => {
                  const config = configurations.find(c => c.channel_type === type.id);
                  const channelId = config?.channel_id || '';
                  const enabled = config?.enabled !== false; // Default to true if not specified
                  
                  return (
                    <Card 
                      key={type.id} 
                      variant="outlined" 
                      sx={{ 
                        mb: 2,
                        borderColor: enabled ? 'primary.main' : 'divider',
                        opacity: enabled ? 1 : 0.7,
                        transition: 'all 0.2s'
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                                {channels
                                  .filter(channel => channel.type === 0) // Only text channels
                                  .map((channel) => (
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
                })}
                
                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={saveSettings}
                    disabled={saving}
                    size="large"
                  >
                    {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    onClick={testConfiguration}
                    disabled={saving}
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
              </>
            )}
          </Paper>
          
          <Paper sx={{ p: 3, borderRadius: 2 }}>
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