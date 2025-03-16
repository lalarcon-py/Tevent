// pages/DiscordSettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Button, Card, Container, Typography, Alert, 
  CircularProgress, Divider, Paper, List, ListItem,
  ListItemIcon, ListItemText
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import axiosInstance from '../config/axios';

export default function DiscordSettingsPage() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [discordGuildId, setDiscordGuildId] = useState('');
  const [serverName, setServerName] = useState('Discord Server');
  const [error, setError] = useState('');

  // Load connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        
        // Check if connected to Discord
        const response = await axiosInstance.get(`/api/discord-bot/guild-mapping/${guildId}`);
        console.log('Discord connection response:', response.data);
        
        setConnected(response.data.connected);
        if (response.data.connected && response.data.discordGuildId) {
          setDiscordGuildId(response.data.discordGuildId);
          
          // Try to get server info
          try {
            const serversResponse = await axiosInstance.get(`/api/discord-bot/servers?guildId=${guildId}`);
            console.log('Discord servers response:', serversResponse.data);
            if (serversResponse.data && serversResponse.data.length > 0) {
              setServerName(serversResponse.data[0].name);
            }
          } catch (err) {
            console.warn('Could not get server name:', err);
          }
        }
      } catch (err) {
        console.error('Error checking Discord connection:', err);
        setError('Failed to check Discord connection status');
      } finally {
        setLoading(false);
      }
    };
    
    if (guildId) {
      checkConnection();
    }
  }, [guildId]);

  // Navigate to dashboard with the "connect discord" tab in sidebar
  const goToConnectDiscord = () => {
    navigate('/dashboard', { state: { openConnectDiscord: true } });
  };
  
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
        Discord Integration
      </Typography>
      
      {!connected ? (
        <Paper elevation={3} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Your guild is not connected to Discord yet
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 4 }}>
            Connect your guild to Discord to enable automatic event notifications, team announcements, and more.
          </Typography>
          
          <Button 
            variant="contained" 
            size="large"
            color="primary"
            onClick={goToConnectDiscord}
            sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
          >
            Connect to Discord
          </Button>
        </Paper>
      ) : (
        <>
          <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
            <Alert 
              severity="success" 
              sx={{ mb: 3 }}
              icon={<CheckCircleIcon fontSize="large" />}
            >
              <Typography variant="h6">
                Connected to Discord Server: {serverName}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                Discord Server ID: {discordGuildId}
              </Typography>
            </Alert>
            
            <Typography variant="body1" paragraph>
              Your Discord server is successfully connected. The bot is now automatically configured 
              and ready to use. All notifications will be posted to the most suitable channels based 
              on Discord permissions.
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Enabled Features:
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <EventIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Event Notifications" 
                  secondary="Automatic announcements when events are created or updated" 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <PeopleIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Team Assignments" 
                  secondary="Team rosters are posted to Discord when teams are formed" 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <StorageIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Loot Distribution" 
                  secondary="Updates when items are added to guild storage or distributed" 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Reminders" 
                  secondary="Event reminders sent 1 hour before each event starts" 
                />
              </ListItem>
            </List>
          </Paper>
          
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Bot Commands
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
              Your members can use these commands in any channel where the bot has access:
            </Typography>
            
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(0,0,0,0.04)', 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>/events</strong> - List upcoming guild events
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>/teams [event_id]</strong> - Show team assignments for an event
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>/storage</strong> - Check guild storage status
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>/help</strong> - Show all available commands
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Button 
              variant="outlined" 
              color="error"
              onClick={async () => {
                try {
                  // This endpoint may not exist yet, but it's what would be needed
                  await axiosInstance.delete(`/api/discord-bot/disconnect/${guildId}`);
                  setConnected(false);
                  window.location.reload();
                } catch (err) {
                  setError('Could not disconnect Discord (API endpoint may not be implemented)');
                  console.error('Error disconnecting Discord:', err);
                }
              }}
            >
              Disconnect Discord Integration
            </Button>
          </Paper>
        </>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
}