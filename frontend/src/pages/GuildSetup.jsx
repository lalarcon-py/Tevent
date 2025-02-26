// frontend/src/pages/GuildSetup.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, Card, CardContent } from '@mui/material';
import axiosInstance from '../config/axios';

const GuildSetup = () => {
  const [tab, setTab] = useState(0);
  const [guilds, setGuilds] = useState([]);
  const [newGuildName, setNewGuildName] = useState('');
  const [joinGuildId, setJoinGuildId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch available guilds
    const fetchGuilds = async () => {
      try {
        const response = await axiosInstance.get('/api/guilds/available');
        setGuilds(response.data);
      } catch (error) {
        console.error('Failed to fetch guilds:', error);
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
      
      // Redirect to the new guild's dashboard
      window.location.href = `/guilds/${response.data.id}/dashboard`;
    } catch (error) {
      console.error('Failed to create guild:', error);
      setError(error.response?.data?.error || 'Failed to create guild');
    } finally {
      setLoading(false);
    }
  };
  
  const handleJoinGuild = async (guildId) => {
    setLoading(true);
    setError(null);
    
    try {
      await axiosInstance.post(`/api/guilds/join/${guildId}`);
      
      // Redirect to the guild's dashboard
      window.location.href = `/guilds/${guildId}/dashboard`;
    } catch (error) {
      console.error('Failed to join guild:', error);
      setError(error.response?.data?.error || 'Failed to join guild');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Welcome to Guild Manager
      </Typography>
      
      <Typography sx={{ mb: 4 }}>
        You are not currently a member of any guild. You can create a new guild or join an existing one.
      </Typography>
      
      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Create a Guild" />
        <Tab label="Join a Guild" />
      </Tabs>
      
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
          >
            Create Guild
          </Button>
        </Box>
      )}
      
      {tab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Available Guilds
          </Typography>
          
          {guilds.length > 0 ? (
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
                  
                  <Button 
                    variant="contained" 
                    onClick={() => handleJoinGuild(guild.id)}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    Join Guild
                  </Button>
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
            value={joinGuildId}
            onChange={(e) => setJoinGuildId(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Button 
            variant="contained" 
            onClick={() => handleJoinGuild(joinGuildId)}
            disabled={!joinGuildId || loading}
          >
            Join with Invitation
          </Button>
        </Box>
      )}
      
      {error && (
        <Typography sx={{ color: 'error.main', mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default GuildSetup;