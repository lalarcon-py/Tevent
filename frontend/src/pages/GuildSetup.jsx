// frontend/src/pages/GuildSetup.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, Card, CardContent, useMediaQuery, useTheme, CircularProgress, Alert } from '@mui/material';
import axiosInstance from '../config/axios';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config/apiUrl';

const GuildSetup = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [guilds, setGuilds] = useState([]);
  const [newGuildName, setNewGuildName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch available guilds
    const fetchGuilds = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/api/guilds/available');
        setGuilds(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch guilds:', error);
        setLoading(false);
      }
    };
    
    fetchGuilds();
  }, []);
  
  const handleCreateGuild = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.post('/api/guilds/create', {
        name: newGuildName
      });
      
      // Get the guild ID from the response
      const newGuildId = response.data.id;
      const newGuildName = response.data.name;
      
      console.log(`Created new guild: ${newGuildName} with ID: ${newGuildId}`);
      
      // Update localStorage with the new guild ID
      try {
        localStorage.setItem('guildId', newGuildId);
        console.log('Updated localStorage with new guild ID:', newGuildId);
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
      
      // Clear any cached data that might be related to previous guild
      try {
        // Clear specific guild data if you have any
        localStorage.removeItem('guildData');
        // You could also clear other guild-specific cache items here
      } catch (e) {
        console.warn('Failed to clear cache:', e);
      }
      
      // Force a full page refresh when redirecting to ensure clean state
      window.location.href = `/guilds/${newGuildId}/dashboard`;
    } catch (error) {
      console.error('Failed to create guild:', error);
      setError(error.response?.data?.error || 'Failed to create guild');
      setLoading(false);
    }
  };
  
  const handleJoinGuild = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!joinCode.trim()) {
        setError('Join code is required');
        setLoading(false);
        return;
      }
      
      // Use the API endpoint for joining by code
      const response = await fetch(`${API_URL}/api/guilds/join-by-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          joinCode: joinCode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join guild');
      }
      
      const data = await response.json();
      
      try {
        localStorage.setItem('guildId', data.guild.id);
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
      
      navigate('/guild-management');
    } catch (error) {
      console.error('Failed to join guild:', error);
      setError(error.message || 'Failed to join guild');
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ 
      maxWidth: 600, 
      mx: 'auto', 
      mt: 4, 
      p: isMobile ? 2 : 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Welcome to Guild Manager
      </Typography>
      
      <Typography sx={{ mb: 4 }}>
        You are not currently a member of any guild. You can create a new guild or join an existing one.
      </Typography>
      
      <Tabs 
        value={tab} 
        onChange={(_, newValue) => setTab(newValue)} 
        sx={{ mb: 3 }}
        variant={isMobile ? "fullWidth" : "standard"}
      >
        <Tab label="Create a Guild" />
        <Tab label="Join a Guild" />
      </Tabs>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {tab === 0 && (
        <Box>
          <TextField
            fullWidth
            label="Guild Name"
            value={newGuildName}
            onChange={(e) => setNewGuildName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Button 
            variant="contained" 
            onClick={handleCreateGuild}
            disabled={!newGuildName || loading}
            sx={{ mt: 2 }}
            fullWidth={isMobile}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Guild'}
          </Button>
        </Box>
      )}
      
      {tab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Available Guilds
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : guilds.length > 0 ? (
            guilds.map(guild => (
              <Card key={guild.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6">{guild.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Owner: {guild.ownerName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Members: {guild.memberCount}
                  </Typography>
                  
                  <Box sx={{ 
                    mt: 2, 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 1 : 0,
                    justifyContent: 'flex-end' 
                  }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate(`/guild-apply?guildId=${guild.id}`)}
                      sx={{ mr: isMobile ? 0 : 1, mb: isMobile ? 1 : 0 }}
                      fullWidth={isMobile}
                    >
                      Apply
                    </Button>
                    <Button 
                      variant="contained" 
                      fullWidth={isMobile}
                      onClick={() => {
                        setJoinCode('');
                        // Implementation for joining directly would go here
                      }}
                      disabled={loading}
                    >
                      Join Guild
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>
              No public guilds available to join
            </Typography>
          )}
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Join by Invitation
          </Typography>
          
          <TextField
            fullWidth
            label="Guild Invitation Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Button 
            variant="contained" 
            onClick={handleJoinGuild}
            disabled={!joinCode || loading}
            fullWidth={isMobile}
          >
            {loading ? <CircularProgress size={24} /> : 'Join with Invitation'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default GuildSetup;