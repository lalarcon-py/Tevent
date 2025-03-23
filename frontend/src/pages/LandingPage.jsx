// src/pages/LandingPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress,
  Alert, Container, Dialog, DialogTitle, DialogContent, 
  DialogActions, useMediaQuery, useTheme, Grid, Divider,
  Paper, Snackbar
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

// Icons
import AddCircleIcon from '@mui/icons-material/AddCircle';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../config/axios';

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL;

const LandingPage = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  
  // Guild management state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCodeDialogOpen, setJoinCodeDialogOpen] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [newGuildName, setNewGuildName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  
  // Logout status notification
  const [showLogoutNotice, setShowLogoutNotice] = useState(false);
  
  // Guild join state
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [selectedGuildName, setSelectedGuildName] = useState('');
  
  // Check if user just logged out
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('logout') === 'success') {
      setShowLogoutNotice(true);
    }
  }, [location]);
  
  // Handle logout notice close
  const handleLogoutNoticeClose = () => {
    setShowLogoutNotice(false);
    
    // Remove the logout parameter from URL
    const params = new URLSearchParams(location.search);
    params.delete('logout');
    navigate({ search: params.toString() }, { replace: true });
  };
  
  // Handle Discord logout button click
  const handleDiscordLogout = () => {
    window.open('https://discord.com/logout', '_blank');
    setShowLogoutNotice(false);
  };
  
  /**
   * Fetch available guilds for joining
   */
  const fetchAvailableGuilds = useCallback(async () => {
    if (!isAuthenticated) return;
  
    try {
      setLoading(true);
      setError(null);
      
      // Explicitly request public guilds only with a clear parameter
      const response = await axiosInstance.get('/api/guilds/available?publicOnly=true');
      
      // Log the raw data for debugging
      console.log('Raw guilds data:', response.data);
      
      // Extra safety filter on the frontend side
      const filteredGuilds = response.data.filter(guild => {
        // Check for the private flag in various possible formats
        return !(
          guild.private_guild === true || 
          guild.privateGuild === true
        );
      });
      
      console.log('Filtered guilds (frontend):', filteredGuilds);
      setGuilds(filteredGuilds);
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
      setError('Unable to load available guilds. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch guilds when dialog opens
  useEffect(() => {
    if (joinDialogOpen && isAuthenticated) {
      fetchAvailableGuilds();
    }
  }, [joinDialogOpen, isAuthenticated, fetchAvailableGuilds]);

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
      
      const response = await axiosInstance.post('/api/guilds/create', {
        name: newGuildName.trim()
      });
      
      setSuccess(`Guild "${response.data.name}" created successfully!`);
      
      // Store guild ID
      try {
        localStorage.setItem('guildId', response.data.id);
      } catch (storageError) {
        console.warn('Failed to update localStorage:', storageError);
      }
      
      // Reset form
      setNewGuildName('');
      setCreateDialogOpen(false);
      
      // Show success message before redirecting
      setTimeout(() => {
        // Force a full page reload to update application state
        window.location.href = '/dashboard';
      }, 1500);
      
    } catch (error) {
      console.error('Guild creation failed:', error);
      setError(error.response?.data?.error || 'Failed to create guild. Please try again.');
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
      const response = await axiosInstance.post('/api/guilds/join-by-code', {
        joinCode: joinCode
      });
      
      setJoinCodeDialogOpen(false);
      
      try {
        localStorage.setItem('guildId', response.data.guild.id);
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
      
      // Redirect to dashboard
      navigate(`/guilds/${response.data.guild.id}/dashboard`);
    } catch (error) {
      console.error('Failed to join guild:', error);
      setError(error.response?.data?.error || 'Failed to join guild');
    } finally {
      setLoading(false);
    }
  };

  // Open join dialog
  const openGuildJoinDialog = (guild) => {
    setSelectedGuildId(guild.id);
    setSelectedGuildName(guild.name);
    setJoinCode('');
    setJoinDialogOpen(true);
  };
  
  const handleLoginClick = () => {
    login();
  };

  // Animated background effect
  const backgroundAnimation = {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59, 130, 246, 0.03) 0%, rgba(13, 29, 45, 0) 70%)',
      pointerEvents: 'none',
      zIndex: 0,
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #040812 0%, #0c1425 40%, #152039 100%)', // Cascading dark blue background
        position: 'relative',
        overflow: 'hidden',
        ...backgroundAnimation,
        pt: { xs: 0, sm: 0 } // Remove top padding to hide header space
      }}
    >
      {/* Background decorative elements for cascade effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.5,
          background: 
            'radial-gradient(circle at 20% 30%, rgba(46, 73, 180, 0.03) 0%, transparent 30%), ' + 
            'radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.02) 0%, transparent 40%), ' +
            'radial-gradient(circle at 40% 80%, rgba(72, 109, 217, 0.04) 0%, transparent 30%)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* Subtle cascade overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0) 0%, rgba(17, 24, 39, 0.1) 70%, rgba(17, 24, 39, 0.2) 100%)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Logout Notification */}
      <Snackbar
        open={showLogoutNotice}
        onClose={handleLogoutNoticeClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 4 }}
      >
        <Paper 
          elevation={4}
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid #3b82f6',
            borderRadius: 2,
            maxWidth: 450
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircleOutlineIcon sx={{ color: '#3b82f6', mr: 1 }} />
            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
              Logged out successfully
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2 }}>
            For complete security, also sign out from Discord:
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              size="small"
              onClick={handleDiscordLogout}
              variant="contained"
              sx={{ 
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' }
              }}
            >
              Logout from Discord
            </Button>
            <Button 
              size="small"
              onClick={handleLogoutNoticeClose}
              sx={{ color: '#94a3b8' }}
            >
              Dismiss
            </Button>
          </Box>
        </Paper>
      </Snackbar>

      {/* Hero Section */}
      <Box 
        sx={{ 
          pt: { xs: 12, sm: 14, md: 16 }, // Increased top padding to account for missing header
          pb: { xs: 8, sm: 10, md: 14 },
          px: { xs: 2, sm: 3, md: 3 },
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/images/hero-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.08, // Very subtle background texture
            zIndex: -1,
          }
        }}
      >
        <Container maxWidth="lg">
          <Typography 
            variant="h1" 
            component="h1"
            sx={{ 
              fontWeight: 800,
              mb: 2,
              color: 'white',
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '5rem' },
              lineHeight: 1.1,
              textShadow: '0 0 30px rgba(59, 130, 246, 0.15)', // Softer shadow
              position: 'relative'
            }}
          >
            Manage Your Guild
            <Typography 
              variant="h1"
              component="span" 
              sx={{ 
                display: 'block',
                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)', // Cascading blue gradient
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 800,
                fontSize: 'inherit',
                my: 1
              }}
            >
              With Precision
            </Typography>
          </Typography>
          
          <Typography 
            variant="h5"
            component="p"
            sx={{ 
              color: 'rgba(255, 255, 255, 0.85)',
              maxWidth: '800px',
              mx: 'auto',
              mb: 6,
              fontWeight: 400,
              lineHeight: 1.5,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
            }}
          >
            The ultimate tool for guild leaders to manage members, events, loot, and more.
          </Typography>
          
          {/* Action Buttons */}
          <Box sx={{ 
            mt: { xs: 4, sm: 6, md: 8 }, 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            justifyContent: 'center', 
            gap: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 0 }
          }}>
            {!isAuthenticated ? (
              <Button 
                variant="contained" 
                size={isMobile ? "medium" : "large"}
                onClick={handleLoginClick}
                sx={{
                  py: { xs: 1.5, md: 2 }, 
                  px: { xs: 4, md: 6 },
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  fontWeight: 600,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f86f7 0%, #3b82f6 60%, #2563eb 100%)', // Cascading blue button
                  boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)', // Reduced shadow
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 15px 30px rgba(59, 130, 246, 0.3)', // Reduced shadow on hover
                    transform: 'translateY(-3px)'
                  }
                }}
              >
                Get Started with Discord
              </Button>
            ) : (
              <>
                <Button 
                  variant="contained" 
                  startIcon={<AddCircleIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  fullWidth={isSmallMobile}
                  sx={{
                    py: { xs: 1.5, md: 2 }, 
                    px: { xs: 3, md: 4 },
                    fontSize: { xs: '0.9rem', md: '1.1rem' },
                    fontWeight: 600,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f86f7 0%, #3b82f6 60%, #2563eb 100%)', // Cascading blue button
                    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)', // Reduced shadow
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 15px 30px rgba(59, 130, 246, 0.3)', // Reduced shadow on hover
                      transform: 'translateY(-3px)'
                    }
                  }}
                >
                  Create a Guild
                </Button>
                
                <Button 
                  variant="outlined"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setJoinDialogOpen(true)}
                  fullWidth={isSmallMobile}
                  sx={{
                    py: { xs: 1.5, md: 2 }, 
                    px: { xs: 3, md: 4 },
                    fontSize: { xs: '0.9rem', md: '1.1rem' },
                    fontWeight: 600,
                    borderRadius: '12px',
                    borderColor: '#3b82f6', // Darker blue
                    borderWidth: 2,
                    color: '#60a5fa',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#2563eb',
                      boxShadow: '0 5px 15px rgba(59, 130, 246, 0.15)', // Reduced shadow
                      transform: 'translateY(-3px)'
                    }
                  }}
                >
                  Join a Guild
                </Button>
                
                <Button 
                  variant="text"
                  startIcon={<VpnKeyIcon />}
                  onClick={() => setJoinCodeDialogOpen(true)}
                  fullWidth={isSmallMobile}
                  sx={{
                    py: { xs: 1.5, md: 2 }, 
                    px: { xs: 3, md: 4 },
                    fontSize: { xs: '0.9rem', md: '1.1rem' },
                    fontWeight: 600,
                    color: '#60a5fa',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      color: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.05)' // Very subtle hover state
                    }
                  }}
                >
                  Join with Code
                </Button>
              </>
            )}
          </Box>
          
          {/* Decorative Elements */}
          <Box 
            sx={{
              position: 'absolute',
              bottom: -120,
              left: '50%',
              transform: 'translateX(-50%)',
              width: { xs: '300px', md: '600px' },
              height: { xs: '300px', md: '600px' },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, rgba(15, 23, 42, 0) 70%)', // More subtle glow
              filter: 'blur(60px)', // Increased blur for softer effect
              zIndex: -1
            }}
          />
        </Container>
      </Box>
      
      {/* Create Guild Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !loading && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            bgcolor: '#1e293b', 
            color: 'white',
            borderRadius: isMobile ? '12px' : '16px',
            backgroundImage: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.02), rgba(15, 23, 42, 0))', // More subtle gradient
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            margin: isMobile ? '16px' : 'auto',
            width: isMobile ? 'calc(100% - 32px)' : undefined
          }
        }}
      >
        <DialogTitle sx={{ 
          fontSize: isMobile ? '1.5rem' : '1.75rem', 
          pt: 3,
          fontWeight: 700,
          color: '#f8fafc',
          textAlign: 'center'
        }}>
          Create Your Guild
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#fecaca',
                '& .MuiAlert-icon': { color: '#ef4444' }
              }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3, 
                bgcolor: 'rgba(34, 197, 94, 0.1)', 
                color: '#bbf7d0',
                '& .MuiAlert-icon': { color: '#22c55e' }
              }}
            >
              {success}
            </Alert>
          )}
          
          <Typography sx={{ mb: 3, color: '#cbd5e1', textAlign: 'center' }}>
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
            autoFocus
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(96, 165, 250, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#60a5fa' }
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiFormHelperText-root': { color: '#f87171' }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            disabled={loading}
            sx={{ color: '#94a3b8' }}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            onClick={handleCreateGuild}
            disabled={loading}
            sx={{
              py: 1,
              px: 4,
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              fontWeight: 600,
              color: 'white',
              borderRadius: '8px'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Guild'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Join Guild Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={() => !loading && setJoinDialogOpen(false)}
        maxWidth={isMobile ? "sm" : "md"}
        fullWidth
        PaperProps={{
          sx: { 
            bgcolor: '#1e293b', 
            color: 'white',
            borderRadius: isMobile ? '12px' : '16px',
            backgroundImage: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.02), rgba(15, 23, 42, 0))', // More subtle gradient
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            margin: isMobile ? '16px' : 'auto',
            width: isMobile ? 'calc(100% - 32px)' : undefined
          }
        }}
      >
        <DialogTitle sx={{ 
          fontSize: isMobile ? '1.5rem' : '1.75rem', 
          pt: 3,
          fontWeight: 700,
          color: '#f8fafc',
          textAlign: 'center'
        }}>
          Join a Guild
        </DialogTitle>
        
        <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#fecaca',
                '& .MuiAlert-icon': { color: '#ef4444' }
              }}
            >
              {error}
            </Alert>
          )}
          
          <Typography sx={{ mb: 3, color: '#cbd5e1', textAlign: 'center' }}>
            Select a guild to join from the list below or use an invite code.
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress sx={{ color: '#60a5fa' }} />
            </Box>
          ) : guilds.length > 0 ? (
            <Grid container spacing={isMobile ? 1 : 2}>
              {guilds.map(guild => (
                <Grid item xs={12} sm={6} md={4} key={guild.id}>
                  <Box
                    sx={{
                      p: isMobile ? 2 : 3,
                      borderRadius: '12px',
                      bgcolor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.2)',
                        borderColor: 'rgba(96, 165, 250, 0.5)'
                      }
                    }}
                  >
                    <Typography variant="h6" sx={{ 
                      color: '#f1f5f9', 
                      mb: 1, 
                      fontWeight: 600,
                      fontSize: isMobile ? '1rem' : '1.25rem'
                    }}>
                      {guild.name}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ 
                      color: '#94a3b8', 
                      mb: 1,
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}>
                      Owner: {guild.ownerName}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ 
                      color: '#94a3b8', 
                      mb: 2,
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}>
                      Members: {guild.memberCount}
                    </Typography>
                    
                    <Box sx={{ 
                      mt: 'auto', 
                      display: 'flex', 
                      gap: 1,
                      flexDirection: isMobile ? 'column' : 'row'
                    }}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate(`/guild-apply?guildId=${guild.id}`)}
                        sx={{
                          flexGrow: 1,
                          bgcolor: '#3b82f6',
                          color: 'white',
                          '&:hover': {
                            bgcolor: '#2563eb'
                          },
                          fontSize: isMobile ? '0.75rem' : '0.875rem'
                        }}
                      >
                        Apply
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ 
              p: 4, 
              textAlign: 'center', 
              bgcolor: 'rgba(30, 41, 59, 0.4)', 
              borderRadius: '12px',
              border: '1px dashed rgba(100, 116, 139, 0.6)'
            }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '1.1rem' }}>
                No guilds available to join. Why not create your own?
              </Typography>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setJoinDialogOpen(false);
                  setCreateDialogOpen(true);
                }}
                sx={{
                  mt: 2,
                  borderColor: '#60a5fa',
                  color: '#60a5fa',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    bgcolor: 'rgba(59, 130, 246, 0.1)'
                  }
                }}
              >
                Create a Guild
              </Button>
            </Box>
          )}
          
          <Divider sx={{ my: 4, borderColor: 'rgba(100, 116, 139, 0.3)' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ color: '#cbd5e1', mb: 2, fontWeight: 600 }}>
              Have a join code?
            </Typography>
            
            <Button
              variant="outlined"
              onClick={() => {
                setJoinDialogOpen(false);
                setJoinCodeDialogOpen(true);
              }}
              endIcon={<ArrowForwardIcon />}
              sx={{
                borderColor: '#60a5fa',
                color: '#60a5fa',
                '&:hover': {
                  borderColor: '#3b82f6',
                  bgcolor: 'rgba(59, 130, 246, 0.1)'
                }
              }}
            >
              Join with Code
            </Button>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setJoinDialogOpen(false)}
            sx={{ color: '#94a3b8' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Join with Code Dialog */}
      <Dialog
        open={joinCodeDialogOpen}
        onClose={() => !loading && setJoinCodeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            bgcolor: '#1e293b', 
            color: 'white',
            borderRadius: isMobile ? '12px' : '16px',
            backgroundImage: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.02), rgba(15, 23, 42, 0))', // More subtle gradient
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            margin: isMobile ? '16px' : 'auto',
            width: isMobile ? 'calc(100% - 32px)' : undefined
          }
        }}
      >
        <DialogTitle sx={{ 
          fontSize: isMobile ? '1.5rem' : '1.75rem', 
          pt: 3,
          fontWeight: 700,
          color: '#f8fafc',
          textAlign: 'center'
        }}>
          Join with Code
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#fecaca',
                '& .MuiAlert-icon': { color: '#ef4444' }
              }}
            >
              {error}
            </Alert>
          )}
          
          <Typography sx={{ mb: 3, color: '#cbd5e1', textAlign: 'center' }}>
            Enter a guild join code to become a member. You can get this code from a guild officer.
          </Typography>
          
          <TextField
            fullWidth
            label="Guild Join Code"
            variant="outlined"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            autoFocus
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(96, 165, 250, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#60a5fa' }
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
          <Button 
            onClick={() => setJoinCodeDialogOpen(false)}
            disabled={loading}
            sx={{ color: '#94a3b8' }}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            onClick={handleJoinGuild}
            disabled={!joinCode.trim() || loading}
            sx={{
              py: 1,
              px: 4,
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              fontWeight: 600,
              color: 'white',
              borderRadius: '8px'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Join Guild'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LandingPage;