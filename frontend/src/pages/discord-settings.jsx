// pages/discord-settings.jsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { 
  Box, Button, Card, Container, FormControl, Grid, 
  MenuItem, Select, Typography, Alert, CircularProgress,
  Snackbar, InputLabel, Divider, Switch, FormControlLabel
} from '@mui/material';

const NOTIFICATION_TYPES = [
  { id: 'events', name: 'Events', description: 'New events, signups, and reminders' },
  { id: 'storage', name: 'Storage/Items', description: 'Guild storage updates and new items' },
  { id: 'loot', name: 'Loot Requests', description: 'Item requests and approvals' },
  { id: 'announcements', name: 'Announcements', description: 'Guild announcements and news' }
];

export default function DiscordSettings() {
  const router = useRouter();
  const { guildId } = router.query;
  
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
  
  // Fetch Discord servers where bot is installed
  useEffect(() => {
    if (!guildId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get Discord connection status
        const statusResponse = await axios.get(`/api/discord-setup/status?guildId=${guildId}`);
        setBotConnected(statusResponse.data.connected);
        
        if (statusResponse.data.connected) {
          // Get Discord servers
          const serversResponse = await axios.get(`/api/discord-setup/servers?guildId=${guildId}`);
          setDiscordGuilds(serversResponse.data);
          
          // If there's a mapped Discord server, select it
          if (statusResponse.data.discordGuildId) {
            setSelectedGuild(statusResponse.data.discordGuildId);
            
            // Get channels for the Discord server
            const channelsResponse = await axios.get(`/api/discord-setup/channels?guildId=${guildId}&discordGuildId=${statusResponse.data.discordGuildId}`);
            setChannels(channelsResponse.data);
            
            // Get current channel configurations
            const configResponse = await axios.get(`/api/discord-setup/channel-config?guildId=${guildId}`);
            setConfigurations(configResponse.data.configurations || []);
          }
        }
      } catch (err) {
        console.error('Error fetching Discord settings:', err);
        setError('Failed to load Discord settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [guildId]);
  
  // When Discord server selection changes, fetch channels
  const handleGuildChange = async (discordGuildId) => {
    try {
      setSelectedGuild(discordGuildId);
      setLoading(true);
      
      const channelsResponse = await axios.get(`/api/discord-setup/channels?guildId=${guildId}&discordGuildId=${discordGuildId}`);
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
  const handleChannelChange = (notificationType, channelId) => {
    const updatedConfigs = [...configurations];
    const existingConfig = updatedConfigs.find(c => c.channel_type === notificationType);
    
    if (existingConfig) {
      existingConfig.channel_id = channelId;
    } else {
      updatedConfigs.push({
        channel_type: notificationType,
        channel_id: channelId,
        enabled: true
      });
    }
    
    setConfigurations(updatedConfigs);
  };
  
  // Toggle enabled status
  const handleToggleEnabled = (notificationType) => {
    const updatedConfigs = [...configurations];
    const existingConfig = updatedConfigs.find(c => c.channel_type === notificationType);
    
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
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };
  
  // Test posting to configured channels
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
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };
  
  // Create a test event
  const createTestEvent = async () => {
    try {
      setSaving(true);
      
      await axios.post(`/api/events`, {
        guildId,
        title: 'Discord Test Event',
        description: 'This is a test event created to verify Discord integration.',
        event_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: 'Discord Test',
        tanks: 2,
        healers: 4,
        dps: 14
      });
      
      setSuccess('Test event created! Check your Discord channel');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error creating test event:', err);
      setError('Failed to create test event');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };
  
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
      <Typography variant="h4" component="h1" gutterBottom>
        Discord Integration Settings
      </Typography>
      
      {!botConnected && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Your guild isn't connected to Discord yet. Please use the Discord bot's <code>/setup</code> command
          in your Discord server first.
        </Alert>
      )}
      
      {botConnected && (
        <>
          <Card sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Select Discord Server
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Discord Server</InputLabel>
              <Select
                value={selectedGuild || ''}
                onChange={(e) => handleGuildChange(e.target.value)}
                label="Discord Server"
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
                
                <Typography variant="h6" gutterBottom>
                  Channel Configuration
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select which Discord channels should receive notifications for each feature.
                </Typography>
                
                {NOTIFICATION_TYPES.map((type) => {
                  const config = configurations.find(c => c.channel_type === type.id);
                  const channelId = config?.channel_id || '';
                  const enabled = config?.enabled !== false; // Default to true if not specified
                  
                  return (
                    <Grid container spacing={2} key={type.id} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={4} md={3}>
                        <Typography variant="subtitle1">
                          {type.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={7}>
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
                      <Grid item xs={12} sm={2} md={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={enabled}
                              onChange={() => handleToggleEnabled(type.id)}
                            />
                          }
                          label="Enabled"
                        />
                      </Grid>
                    </Grid>
                  );
                })}
                
                <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={saveSettings}
                    disabled={saving}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    onClick={testConfiguration}
                    disabled={saving}
                  >
                    Test Channels
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    color="secondary"
                    onClick={createTestEvent}
                    disabled={saving}
                  >
                    Create Test Event
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
          </Card>
        </>
      )}
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        message={error}
      />
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess('')}
      >
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Container>
  );
}