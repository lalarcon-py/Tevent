// pages/DiscordSettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Button, Card, Container, FormControl, Grid, 
  MenuItem, Select, Typography, Alert, CircularProgress,
  Snackbar, InputLabel, Divider, Paper, Link
} from '@mui/material';
import axiosInstance from '../config/axios';
import CodeIcon from '@mui/icons-material/Code';

export default function DiscordSettingsPage() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [discordGuilds, setDiscordGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [botConnected, setBotConnected] = useState(false);
  const [discordGuildId, setDiscordGuildId] = useState(null);
  
  // Fetch Discord connection status
  useEffect(() => {
    if (!guildId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching Discord connection status for guild:', guildId);
        
        // Get Discord connection status
        const statusResponse = await axiosInstance.get(`/api/discord-bot/guild-mapping/${guildId}`);
        console.log('Discord connection status response:', statusResponse.data);
        
        setBotConnected(statusResponse.data.connected);
        setDiscordGuildId(statusResponse.data.discordGuildId);
        
        if (statusResponse.data.connected) {
          try {
            // Get Discord servers
            const serversResponse = await axiosInstance.get(`/api/discord-bot/servers?guildId=${guildId}`);
            console.log('Discord servers response:', serversResponse.data);
            setDiscordGuilds(serversResponse.data);
            
            // Set selected guild
            if (statusResponse.data.discordGuildId) {
              setSelectedGuild(statusResponse.data.discordGuildId);
            }
          } catch (serverError) {
            console.error('Error fetching Discord servers:', serverError);
            setError('Could not load Discord servers. The servers endpoint may not be fully implemented.');
          }
        }
      } catch (err) {
        console.error('Error fetching Discord settings:', err);
        setError('Failed to load Discord connection status: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [guildId]);
  
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
      <Typography variant="h4" component="h1" gutterBottom>
        Discord Integration Settings
      </Typography>
      
      {!botConnected && (
        <>
          <Alert severity="warning" sx={{ mb: 4 }}>
            Your guild isn't connected to Discord yet. You need to connect your Discord server first.
          </Alert>
          
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              How to Connect Discord
            </Typography>
            
            <Typography variant="body1" paragraph>
              To connect your guild to Discord:
            </Typography>
            
            <ol>
              <li>
                <Typography paragraph>
                  Go to your guild's dashboard and click "Connect Discord" in the sidebar
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Follow the prompts to add the bot to your Discord server
                </Typography>
              </li>
              <li>
                <Typography paragraph>
                  Use the provided join code with the bot's <code>/link-guild</code> command in your Discord server
                </Typography>
              </li>
            </ol>
            
            <Button 
              variant="contained" 
              onClick={() => navigate('/dashboard')}
              sx={{ mt: 2 }}
            >
              Return to Dashboard
            </Button>
          </Paper>
        </>
      )}
      
      {botConnected && (
        <>
          <Alert severity="success" sx={{ mb: 4 }}>
            Your guild is connected to Discord server with ID: {discordGuildId}
          </Alert>
          
          <Card sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Discord Server
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Connected Discord Server</InputLabel>
              <Select
                value={selectedGuild || ''}
                disabled={true}
                label="Discord Server"
              >
                {discordGuilds.map((server) => (
                  <MenuItem key={server.id} value={server.id}>
                    {server.name}
                  </MenuItem>
                ))}
                {discordGuilds.length === 0 && (
                  <MenuItem value={discordGuildId}>
                    Discord Server ({discordGuildId})
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 3 }} />
            
            <Alert severity="info" icon={<CodeIcon />} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Channel Configuration API Not Implemented
              </Typography>
              <Typography variant="body2">
                The API endpoints for channel configuration have not been fully implemented on the backend:
              </Typography>
              <ul>
                <li><code>/api/discord-bot/channels</code> - For fetching available Discord channels</li>
                <li><code>/api/discord-bot/channel-config</code> - For managing notification settings</li>
                <li><code>/api/discord-bot/test-channels</code> - For testing channel integration</li>
              </ul>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Once these endpoints are implemented, channel configuration will be available on this page.
              </Typography>
            </Alert>
            
            <Button 
              variant="outlined" 
              color="error"
              onClick={async () => {
                try {
                  await axiosInstance.delete(`/api/discord-bot/disconnect/${guildId}`);
                  setBotConnected(false);
                  setSuccess('Discord connection removed successfully');
                  setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                  setError('Failed to disconnect Discord: this endpoint may not be implemented yet');
                }
              }}
              sx={{ mt: 2 }}
            >
              Disconnect Discord
            </Button>
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