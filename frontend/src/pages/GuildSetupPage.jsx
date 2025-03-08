// src/pages/GuildSetupPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  CardActions,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

const GuildSetupPage = () => {
  // Auth context
  const { isAuthenticated, user, login, isLoading } = useAuth();
  const location = useLocation();
  
  // Local state
  const [activeTab, setActiveTab] = useState(0);
  const [guilds, setGuilds] = useState([]);
  const [newGuildName, setNewGuildName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();
  

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [selectedGuildName, setSelectedGuildName] = useState('');
  
  // Clear any errors when tab changes

  const { state } = useLocation();
    useEffect(() => {
    // Set active tab based on navigation state
    if (state?.tab !== undefined) {
        setActiveTab(state.tab);
    }
    }, [state]);

  useEffect(() => {
    // Only show a login button if not authenticated, don't auto-redirect
    if (!isLoading && !isAuthenticated) {
      // We'll handle this in the render method instead of redirecting
      console.log("User not authenticated, showing login option");
    }
  }, [isAuthenticated, isLoading]);


  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [activeTab]);

  const openJoinDialog = (guild) => {
    setSelectedGuildId(guild.id);
    setSelectedGuildName(guild.name);
    setJoinCode('');
    setJoinDialogOpen(true);
  };

  /**
   * Fetch available guilds for joining
   */
  const fetchAvailableGuilds = useCallback(async () => {
    if (!isAuthenticated) return;
  
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/guilds/available`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available guilds');
      }
      
      const availableGuilds = await response.json();
      setGuilds(availableGuilds);
    } catch (error) {
      console.error('Failed to fetch available guilds:', error);
      setError('Unable to load available guilds. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch guilds when tab changes to join tab
  useEffect(() => {
    if (activeTab === 1 && isAuthenticated) {
      fetchAvailableGuilds();
    }
  }, [activeTab, isAuthenticated, fetchAvailableGuilds]);

  /**
   * Validate guild name
   */
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

  /**
   * Handle guild creation
   */
  const handleCreateGuild = async () => {
    if (!validateGuildName()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Generate a random join code (6 alphanumeric characters)
      const generateJoinCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const response = await fetch(`${API_URL}/api/guilds/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGuildName.trim(),
          join_code: generateJoinCode() // Add this line to generate a join code
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create guild');
      }
      
      const data = await response.json();
      setSuccess(`Guild "${data.name}" created successfully!`);
      
      // Safely store guild ID
      try {
        localStorage.setItem('guildId', data.id);
      } catch (storageError) {
        console.warn('Failed to store guild ID in localStorage:', storageError);
      }
      
      // Reset form
      setNewGuildName('');
      
      // Redirect after delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Guild creation failed:', error);
      setError(error.message || 'Failed to create guild. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle joining an existing guild
   */
  const handleJoinGuild = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!joinCode.trim()) {
        setError('Join code is required');
        setLoading(false);
        return;
      }
      
      // Use the new endpoint that doesn't require a guild ID
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
      setJoinDialogOpen(false);
      
      try {
        localStorage.setItem('guildId', data.guild.id);
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
      
      navigate(`/guilds/${data.guild.id}/dashboard`);
    } catch (error) {
      console.error('Failed to join guild:', error);
      setError(error.message || 'Failed to join guild');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithInviteCode = async () => {
    if (!joinCode.trim()) {
      setError('Join code is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Join by code only
      await handleJoinGuild();
    } catch (error) {
      setError(error.message || 'Failed to join guild');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Discord login
   */
  const handleLogin = () => {
    // Use login from AuthContext
    login();
  };

  return (
    <Container maxWidth="lg" sx={{ 
        py: 4, 
        mt: 8, // Add top margin to account for AppHeader
      }}>
        <Paper
          elevation={5}
          sx={{
            width: '100%',
            maxWidth: 900,
            mx: 'auto',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
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
              onClick={handleLogin}
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
            <Typography variant="h4" sx={{ p: 3, color: '#f0f0f0', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              Welcome, {user?.username || 'Adventurer'}!
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mx: 3, mt: 3 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mx: 3, mt: 3 }}>
                {success}
              </Alert>
            )}
            
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              centered
              sx={{ 
                px: 2,
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
              <Tab 
                label="Join with Code" 
                icon={<VpnKeyIcon />} 
                iconPosition="start" 
              />
            </Tabs>
            
            <Box sx={{ p: 3, minHeight: '300px' }}>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, color: '#f0f0f0' }}>
                    Create Your Guild
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: '#bbb' }}>
                    Create a new guild and become its Guild Master. You'll be able to invite others to join.
                  </Typography>
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
              
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, color: '#f0f0f0' }}>
                    Available Guilds
                  </Typography>
                  
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : guilds.length > 0 ? (
                    <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                                variant="outlined" 
                                onClick={() => {
                                  navigate(`/guild-apply`, {
                                    state: { guildId: guild.id }
                                  });
                                }}
                                sx={{
                                  mr: 1,
                                  color: '#90caf9',
                                  borderColor: '#90caf9',
                                  '&:hover': { borderColor: '#64b5f6', color: '#64b5f6' }
                                }}
                              >
                                Apply
                              </Button>
                            <Button 
                              variant="contained" 
                              onClick={() => openJoinDialog(guild)}
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
                </Box>
              )}
              
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, color: '#f0f0f0' }}>
                    Join with Invitation Code
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: '#bbb' }}>
                    Enter a guild join code to become a member. You can get this code from a guild officer.
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Guild Join Code"
                    variant="outlined"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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
                    variant="contained"
                    onClick={handleJoinWithInviteCode}
                    disabled={!joinCode.trim() || loading}
                    sx={{
                      height: 48,
                      bgcolor: '#90caf9',
                      color: '#1a1a1a',
                      fontWeight: 'bold',
                      '&:hover': { bgcolor: '#64b5f6' }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Join Guild'}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Paper>
  
      {/* Join Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={() => !loading && setJoinDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle>Join {selectedGuildName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
            Enter the guild's join code to become a member:
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Join Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            disabled={loading}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setJoinDialogOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleJoinGuild}
            disabled={!joinCode.trim() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Joining...' : 'Join Guild'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GuildSetupPage;