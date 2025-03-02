// src/components/Guild/GuildSetupOverlay.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  CardActions,
  Alert
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

const GuildSetupOverlay = () => {
  const { isAuthenticated, user, checkAuth } = useAuth();
  const [tab, setTab] = useState(0);
  const [guilds, setGuilds] = useState([]);
  const [newGuildName, setNewGuildName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [joinGuildId, setJoinGuildId] = useState('');
  const navigate = useNavigate();

  // Fetch available guilds when on "Join" tab
  useEffect(() => {
    if (tab === 1 && isAuthenticated) {
      fetchAvailableGuilds();
    }
  }, [tab, isAuthenticated]);


  // Add effect to refresh auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchAvailableGuilds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/guilds/available`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch available guilds');
      
      const availableGuilds = await response.json();
      setGuilds(availableGuilds);
    } catch (error) {
      console.error('Failed to fetch available guilds:', error);
      setError('Unable to load available guilds');
    } finally {
      setLoading(false);
    }
  };

  const validateGuildName = () => {
    if (!newGuildName.trim()) {
      setNameError('Guild name is required');
      return false;
    }
    
    if (newGuildName.length < 3) {
      setNameError('Guild name must be at least 3 characters');
      return false;
    }
    
    if (newGuildName.length > 50) {
      setNameError('Guild name must be less than 50 characters');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const handleCreateGuild = async () => {
    if (!validateGuildName()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/guilds/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGuildName.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create guild');
      }
      
      const data = await response.json();
      setSuccess(`Guild "${data.name}" created successfully!`);

      await checkAuth(); // Re-check auth status
      
      // Save guild ID to local storage
      localStorage.setItem('guildId', data.id);
      
      // Redirect after a brief delay to show success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Guild creation failed:', error);
      setError(error.message || 'Failed to create guild');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGuild = async (guildId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/guilds/join/${guildId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join guild');
      }
      
      const data = await response.json();
      setSuccess(`Successfully joined guild!`);

      await checkAuth(); // Re-check auth status
      
      // Save guild ID to local storage
      localStorage.setItem('guildId', guildId);
      
      // Redirect after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to join guild:', error);
      setError(error.message || 'Failed to join guild');
    } finally {
      setLoading(false);
    }
  };

  // When tab changes to "Join Guild", fetch available guilds
  const handleTabChange = (_, newValue) => {
    setTab(newValue);
    if (newValue === 1) {
      fetchAvailableGuilds();
    }
  };


  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <Paper
        elevation={5}
        sx={{
          width: '100%',
          maxWidth: 700,
          p: 4,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {!isAuthenticated ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h4" sx={{ mb: 4, color: '#f0f0f0' }}>
              Welcome to Tevent Guild Manager
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, color: '#bbb' }}>
              Please log in with Discord to continue.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              // Add proper redirect parameter
              onClick={() => window.location.href = `${API_URL}/auth/discord?redirectUrl=${encodeURIComponent(window.location.origin)}`}
              size="large"
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                bgcolor: '#5865F2', // Discord blue
                '&:hover': {
                  bgcolor: '#4752c4'
                }
              }}
            >
              Login with Discord
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="h4" sx={{ mb: 2, color: '#f0f0f0', textAlign: 'center' }}>
              Welcome, {user?.username || 'Adventurer'}!
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: '#bbb', textAlign: 'center' }}>
              You need to create or join a guild to proceed.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}
            
            <Tabs 
              value={tab} 
              onChange={(_, newValue) => setTab(newValue)} 
              centered
              sx={{ 
                mb: 4,
                '& .MuiTab-root': { color: '#bbb' },
                '& .Mui-selected': { color: '#90caf9' },
                '& .MuiTabs-indicator': { backgroundColor: '#90caf9' }
              }}
            >
              <Tab 
                label="Create a Guild" 
                icon={<AddCircleIcon />} 
                iconPosition="start" 
              />
              <Tab 
                label="Join a Guild" 
                icon={<GroupAddIcon />} 
                iconPosition="start" 
              />
            </Tabs>
            
            {tab === 0 && (
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  label="Guild Name"
                  variant="outlined"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  error={!!nameError}
                  helperText={nameError}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiFormHelperText-root': { color: '#f44336' }
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCreateGuild}
                  disabled={loading}
                  sx={{
                    height: 48,
                    bgcolor: '#90caf9',
                    color: '#1a1a1a',
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: '#64b5f6' }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Guild'}
                </Button>
              </Box>
            )}
            
            {tab === 1 && (
              <Box sx={{ p: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : guilds.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2, color: '#f0f0f0' }}>
                      Available Guilds
                    </Typography>
                    
                    {guilds.map(guild => (
                      <Card 
                        key={guild.id} 
                        sx={{ 
                          mb: 2, 
                          bgcolor: 'rgba(30, 30, 30, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'transform 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
                          }
                        }}
                      >
                        <CardContent>
                          <Typography variant="h6" sx={{ color: '#f0f0f0' }}>
                            {guild.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#bbb', mb: 1 }}>
                            Owner: {guild.ownerName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#bbb' }}>
                            Members: {guild.memberCount}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                          <Button 
                            variant="contained" 
                            onClick={() => handleJoinGuild(guild.id)}
                            disabled={loading}
                            sx={{
                              bgcolor: '#90caf9',
                              color: '#1a1a1a',
                              '&:hover': { bgcolor: '#64b5f6' }
                            }}
                          >
                            Join Guild
                          </Button>
                        </CardActions>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ textAlign: 'center', color: '#bbb' }}>
                    No guilds available to join. Why not create your own?
                  </Typography>
                )}
                
                <Divider sx={{ my: 3, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
                
                <Typography variant="h6" sx={{ mb: 2, color: '#f0f0f0' }}>
                  Join with Invitation Code
                </Typography>
                <TextField
                  fullWidth
                  label="Guild Invitation Code"
                  variant="outlined"
                  value={joinGuildId}
                  onChange={(e) => setJoinGuildId(e.target.value)}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' }
                  }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleJoinGuild(joinGuildId)}
                  disabled={!joinGuildId.trim() || loading}
                  sx={{
                    height: 48,
                    borderColor: '#90caf9',
                    color: '#90caf9',
                    '&:hover': { borderColor: '#64b5f6', color: '#64b5f6' }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Join with Code'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default GuildSetupOverlay;