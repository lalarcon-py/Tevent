// frontend/src/pages/DiscordSetupPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, CircularProgress, 
  Select, MenuItem, FormControl, InputLabel,
  Alert
} from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../config/axios';

const DiscordSetupPage = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const token = searchParams.get('token');
  const serverId = searchParams.get('serverId');
  const serverName = searchParams.get('serverName') || 'Discord Server';
  
  useEffect(() => {
    if (!token || !serverId) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }
    
    if (!isAuthenticated) {
      return;
    }
    
    const fetchGuilds = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/discord-setup/my-guilds');
        setGuilds(response.data);
        
        if (response.data.length === 0) {
          setError('You are not a Guild Master of any active guild.');
        }
      } catch (err) {
        console.error('Error fetching guilds:', err);
        setError('Failed to load your guilds. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuilds();
  }, [isAuthenticated, token, serverId]);
  
  const handleSubmit = async () => {
    if (!selectedGuild) {
      setError('Please select a guild');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.post('/api/discord-setup/complete-link', {
        token,
        guildId: selectedGuild
      });
      
      if (response.data.success) {
        setSuccess(true);
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate(`/guilds/${selectedGuild}/dashboard`);
        }, 3000);
      }
    } catch (err) {
      console.error('Error linking Discord server:', err);
      setError(err.response?.data?.error || 'Failed to link Discord server');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4, px: 2 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Link Discord Server
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          You're linking <strong>{serverName}</strong> to your Tevent guild.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Successfully linked Discord server to your guild! Redirecting to dashboard...
          </Alert>
        )}
        
        {guilds.length > 0 && !success && (
          <>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Your Guild</InputLabel>
              <Select
                value={selectedGuild}
                onChange={(e) => setSelectedGuild(e.target.value)}
                label="Select Your Guild"
              >
                {guilds.map(guild => (
                  <MenuItem key={guild.id} value={guild.id}>
                    {guild.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Only guilds where you are the Guild Master are shown.
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              disabled={!selectedGuild || loading}
              onClick={handleSubmit}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Link Discord to Guild'}
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DiscordSetupPage;