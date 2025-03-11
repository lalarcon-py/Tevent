// frontend/src/pages/DiscordSetupPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  Alert
} from '@mui/material';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';

const DiscordSetupPage = () => {
  const [searchParams] = useSearchParams();
  const discordGuildId = searchParams.get('guildId');
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      login();
      return;
    }
    
    if (!discordGuildId) {
      setError('Discord server ID is missing. Please use the link provided by the bot.');
      setLoading(false);
      return;
    }
    
    const fetchGuilds = async () => {
      try {
        const response = await axiosInstance.get('/api/discord/linkable-guilds');
        
        if (response.data.length === 0) {
          setError('You don\'t have any guilds you can link. You must be a Guild Master to link a guild.');
        } else {
          // Automatically select the first guild
          setGuild(response.data[0]);
        }
      } catch (err) {
        setError('Failed to load your guild. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuilds();
  }, [isAuthenticated, discordGuildId, login]);

  const handleLink = async () => {
    try {
      setLoading(true);
      
      // Use the new auto-link endpoint that doesn't require specifying a guild
      const response = await axiosInstance.post('/api/discord/link-auto', {
        discordGuildId
      });
      
      setSuccess(true);
      // Optionally show the guild name that was linked
      setGuild({ name: response.data.guildName || 'Your guild' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to link server. Please try again.');
      console.error('Link error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Discord server linked successfully!
        </Alert>
        <Typography sx={{ mb: 2 }}>
          You can now close this page and return to Discord. The bot is ready to use!
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.close()}
        >
          Close Window
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Link Discord Server to Guild
      </Typography>
      
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Link Discord to Your Guild
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          This will connect your Discord server to your guild where you're a Guild Master.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={handleLink}
          sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
        >
          Link Discord Now
        </Button>
      </Paper>
      )}
    </Box>
  );
};

export default DiscordSetupPage;