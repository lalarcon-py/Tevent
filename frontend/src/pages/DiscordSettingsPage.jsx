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
  const { guildId } = useParams();
  const { guildRole } = useGuild();
  
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
    if (!guildId || !isGuildMaster) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get Discord connection status
        const statusResponse = await axios.get(`/api/discord-setup/status?guildId=${guildId}`);
        setBotConnected(statusResponse.data.connected);
        
        if (statusResponse.data.connected) {
          // Get Discord servers where bot is installed
          const serversResponse = await axios.get(`/api/discord-setup/servers?guildId=${guildId}`);
          setDiscordGuilds(serversResponse.data);
          
          if (statusResponse.data.discordGuildId) {
            setSelectedGuild(statusResponse.data.discordGuildId);
            
            // Fetch channels for this Discord server
            const channelsResponse = await axios.get(
              `/api/discord-setup/channels?guildId=${guildId}&discordGuildId=${statusResponse.data.discordGuildId}`
            );
            setChannels(channelsResponse.data);
            
            // Get existing channel configurations
            const configResponse = await axios.get(`/api/discord-setup/channel-config?guildId=${guildId}`);
            setConfigurations(configResponse.data.configurations || []);
          }
        }
      } catch (err) {
        console.error('Error fetching Discord data:', err);
        setError('Failed to load Discord settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [guildId, isGuildMaster]);
  
  // Handle Discord server selection change
  const handleGuildChange = async (discordGuildId) => {
    try {
      setSelectedGuild(discordGuildId);
      setLoading(true);
      
      // Get channels for the selected Discord server
      const channelsResponse = await axios.get(
        `/api/discord-setup/channels?guildId=${guildId}&discordGuildId=${discordGuildId}`
      );
      setChannels(channelsResponse.data);
      
      // Get current channel configurations
      const configResponse = await axios.get(`/api/discord-setup/channel-config?guildId=${guildId}`);
      setConfigurations(configResponse.data.configurations || []);
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
      
      await axios.post(`/api/discord-setup/channel-config`, {
        guildId,
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
      
      const response = await axios.post(`/api/discord-setup/test-channels`, {
        guildId,
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
    axios.get(`/api/guilds/${guildId}/settings`)
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