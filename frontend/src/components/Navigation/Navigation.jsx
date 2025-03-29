// components/Navigation/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { 
  Drawer, List, ListItem, ListItemIcon, ListItemText, 
  Divider, IconButton, Box, useMediaQuery, useTheme,
  AppBar, Toolbar, Typography, Button, Tooltip, Badge
} from '@mui/material';
import { Link, useLocation, Navigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import EventIcon from '@mui/icons-material/Event';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LogoutIcon from '@mui/icons-material/Logout';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useAuth } from '../../contexts/AuthContext';
import LogoutButton from '../Auth/LogoutButton';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReceiptIcon from '@mui/icons-material/Receipt';
import axiosInstance from '../../config/axios';
import DiscordIcon from '@mui/icons-material/ConnectedTv';

const Navigation = ({ guildId }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const [guildRole, setGuildRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [discordConnected, setDiscordConnected] = useState(false);
  
  const debugLog = (message, data) => {
    console.log(`🔍 DEBUG [${new Date().toISOString()}]: ${message}`, data);
  };
  
  useEffect(() => {
    const fetchGuildData = async () => {
      if (!user) {
        return;
      }
      
      try {
        setLoading(true);
        
        const currentGuildId = guildId || localStorage.getItem('guildId');
        
        if (!currentGuildId) {
          setLoading(false);
          return;
        }
        
        const response = await axiosInstance.get(`/api/guilds/${currentGuildId}/members`);
        
        const currentMember = response.data.find(member => member.id === user.id);
        
        if (currentMember) {
          setGuildRole(currentMember.role);
          
          try {
            const discordResponse = await axiosInstance.get(`/api/discord-bot/guild-mapping/${currentGuildId}`);
            setDiscordConnected(discordResponse.data.connected === true);
          } catch (err) {
            console.error('Error checking Discord connection:', err);
            setDiscordConnected(false);
          }
        } else {
          setGuildRole('');
          setDiscordConnected(false);
        }
      } catch (error) {
        console.error('Error in fetchGuildData:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGuildData();
  }, [user, guildId]);
  
  // Close mobile drawer when route changes
  useEffect(() => {
    if (isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile, mobileOpen]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const getDiscordClientId = async () => {
    try {
      // Try to get the client ID from an API endpoint that serves application config
      const configResponse = await axiosInstance.get('/api/config/discord');
      if (configResponse.data && configResponse.data.clientId) {
        return configResponse.data.clientId;
      }
      
      // If that fails, try to get it from your guild settings (if it's stored there)
      const currentGuildId = guildId || localStorage.getItem('guildId');
      const settingsResponse = await axiosInstance.get(`/api/guilds/${currentGuildId}/settings`);
      if (settingsResponse.data && settingsResponse.data.discordClientId) {
        return settingsResponse.data.discordClientId;
      }
      
      // Fall back to environment variable as last resort
      if (process.env.REACT_APP_DISCORD_CLIENT_ID) {
        return process.env.REACT_APP_DISCORD_CLIENT_ID;
      }
      
      throw new Error('Could not find Discord client ID');
    } catch (error) {
      console.error('Failed to get Discord client ID:', error);
      throw error;
    }
  };

  const handleDiscordIntegration = async () => {
    debugLog('handleDiscordIntegration called', null);
    
    // Get the guild's join code
    const currentGuildId = guildId || localStorage.getItem('guildId');
    
    if (!currentGuildId) {
      debugLog('No guild ID available for Discord integration', null);
      alert('No guild selected');
      return;
    }
    
    try {
      // Get guild settings for join code
      const settingsResponse = await axiosInstance.get(`/api/guilds/${currentGuildId}/settings`);
      const joinCode = settingsResponse.data.joinCode;
      debugLog('Join code', joinCode);
      
      if (!joinCode) {
        alert('Could not retrieve your guild join code. Please contact support.');
        return;
      }
      
      // Get Discord client ID
      const clientId = await getDiscordClientId();
      debugLog('Discord client ID', clientId);
      
      if (!clientId) {
        alert('Could not retrieve Discord client ID. Please try again later or contact support.');
        return;
      }
      
      // Create OAuth URL (standard bot invite URL)
      const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=2147485696&scope=bot%20applications.commands`;
      
      // Open Discord authorization in new tab
      window.open(discordUrl, '_blank');
      
      // Show instructions with actual join code
      setTimeout(() => {
        alert(`After adding the bot to your Discord server, use this command:\n\n/link-guild join_code:${joinCode}`);
      }, 500);
    } catch (error) {
      debugLog('Error in Discord integration', error);
      alert('Could not connect to Discord. Please try again later.');
    }
  };
  
  const isGuildMaster = guildRole === 'Guild Master';
  const isAdvisorOrMaster = ['Guild Master', 'Guild Advisor'].includes(guildRole);
  const hasDashboardAccess = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(guildRole);

  const baseMenuItems = [];
  
  if (hasDashboardAccess) {
    baseMenuItems.push({
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    });
  }
  
  baseMenuItems.push(
    {
      text: 'Guild Members',
      icon: <GroupIcon />,
      path: '/guild-management'
    },
    {
      text: 'Guild Storage',
      icon: <StorageIcon />,
      path: '/loot-management'
    },
    {
      text: 'Event Planner',
      icon: <EventIcon />,
      path: '/event-planner'
    },
    {
      text: 'Static Teams',
      icon: <GroupIcon />,
      path: '/static-teams'
    },
    {
      text: 'Event Summaries',
      icon: <FormatListBulletedIcon />,
      path: '/event-summaries'
    },
    {
      text: 'Gear Check',
      icon: <FormatListBulletedIcon />,
      path: '/gear-check'
    }
  );
  
  if (isAdvisorOrMaster) {
    baseMenuItems.push({
      text: 'Guild Applications',
      icon: <PersonAddIcon />,
      path: '/applications'
    });
  }
  
  if (isGuildMaster) {
    baseMenuItems.push({
      text: 'Billing',
      icon: <ReceiptIcon />,
      path: '/billing'
    });
    
    debugLog('Discord connection state for menu item', discordConnected);
    
    if (discordConnected) {
      baseMenuItems.push({
        text: 'Discord Settings',
        icon: <DiscordIcon />,
        path: `/guilds/${guildId}/discord/settings`
      });
    } else {
      baseMenuItems.push({
        text: 'Connect Discord',
        icon: <DiscordIcon />,
        onClick: handleDiscordIntegration
      });
    }
  }

  // Define mobile menu items separately - prioritize the most important features for mobile
  const mobileMenuItems = [
    {
      text: 'Events',
      icon: <CalendarMonthIcon />,
      path: '/event-planner'
    },
    {
      text: 'Summaries',
      icon: <SummarizeIcon />,
      path: '/event-summaries'
    },
    {
      text: 'Teams',
      icon: <GroupsIcon />,
      path: '/team-planner'
    },
    {
      text: 'Guild',
      icon: <GroupIcon />,
      path: '/guild-management'
    }
  ];

  const drawer = (
    <>
      {/* Add padding spacer to account for AppHeader height */}
      <Box sx={{ height: '64px' }} />
      
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', // Changed to center the content
        p: 1,
        position: 'relative', // Added for absolute positioning of close button
        ...isMobile ? { py: 2 } : {}
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'white',
            fontFamily: '"Poppins", "Roboto", "Arial", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontSize: '1.1rem'
          }}
        >
          TEVENT
        </Typography>
        {isMobile && (
          <IconButton 
            onClick={handleDrawerToggle} 
            sx={{ 
              color: 'white',
              position: 'absolute',
              right: 8
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      {/* Debug info with improved display */}
      <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(0,0,0,0.2)' }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Guild Role: {loading ? 'Loading...' : (guildRole || 'None')}
        </Typography>
      </Box>
      
      {/* Main menu items */}
      <List sx={{ py: 2, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
          {baseMenuItems.map((item) => (
            <Tooltip title={isMobile ? item.text : ""} placement="right" key={item.text}>
              <ListItem 
                button 
                component={item.onClick ? 'div' : Link}
                to={!item.onClick ? item.path : undefined}
                onClick={item.onClick}
                sx={{ 
                  color: location.pathname === item.path ? '#90caf9' : 'white',
                  backgroundColor: location.pathname === item.path ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                  py: 1.5,
                  px: isMobile ? 1.5 : 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path ? '#90caf9' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: isMobile ? 40 : 56
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontSize: isMobile ? '0.95rem' : '1rem',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    noWrap: true
                  }}
                />
              </ListItem>
            </Tooltip>
          ))}
        </List>
      
      {/* Spacer to push settings and logout to bottom */}
      <Box sx={{ flexGrow: 1 }} />
      
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', mt: 2 }} />
      
      {/* Settings and Logout at bottom */}
      <List>
        <ListItem 
          button 
          component={Link} 
          to={guildId ? `/guilds/${guildId}/settings` : '/settings'}
          sx={{ 
            color: location.pathname.includes('/settings') ? '#90caf9' : 'white',
            backgroundColor: location.pathname.includes('/settings') ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
            py: 1.5,
            px: isMobile ? 1.5 : 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)'
            }
          }}
        >
          <ListItemIcon sx={{ 
            color: location.pathname.includes('/settings') ? '#90caf9' : 'rgba(255, 255, 255, 0.7)',
            minWidth: isMobile ? 40 : 56
          }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Guild Settings" 
            primaryTypographyProps={{ 
              fontSize: isMobile ? '0.95rem' : '1rem',
              fontWeight: location.pathname.includes('/settings') ? 'bold' : 'normal',
              noWrap: true
            }}
          />
        </ListItem>
        <ListItem 
          button
          onClick={async () => {
            try {
              // Clear localStorage safely
              try {
                localStorage.removeItem('guildId');
                console.log('Successfully cleared localStorage');
              } catch (storageError) {
                console.warn('Failed to access localStorage:', storageError);
              }
              
              // Get backend URL
              const BACKEND_URL = process.env.NODE_ENV === 'production'
                ? (process.env.REACT_APP_BACKEND_URL || window.location.origin)
                : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');
              
              // Redirect to backend logout endpoint
              window.location.href = `${BACKEND_URL}/auth/logout?redirectUrl=${encodeURIComponent(window.location.origin)}`;
            } catch (error) {
              console.error('Logout process failed:', error);
            }
          }}
          sx={{ 
            color: 'white',
            py: 1.5,
            px: isMobile ? 1.5 : 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)'
            }
          }}
        >
          <ListItemIcon sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: isMobile ? 40 : 56
          }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{ 
              fontSize: isMobile ? '0.95rem' : '1rem',
              noWrap: true
            }}
          />
        </ListItem>
      </List>
    </>
  );

  // Mobile Navigation Bar - use the mobile menu items
  const mobileNavBar = isMobile && (
    <AppBar
      position="fixed"
      sx={{
        display: { sm: 'none' },
        top: 'auto',
        bottom: 0,
        bgcolor: '#1a1a1a',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        zIndex: 1200
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-around', minHeight: '56px', px: 1 }}>
        {mobileMenuItems.map((item) => (
          <IconButton
            key={item.text}
            component={item.onClick ? 'div' : Link}
            to={!item.onClick ? item.path : undefined}
            onClick={item.onClick}
            sx={{ 
              color: location.pathname === item.path ? '#90caf9' : 'white',
              display: 'flex',
              flexDirection: 'column',
              fontSize: '0.6rem'
            }}
          >
            {item.icon}
            <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
              {item.text}
            </Typography>
          </IconButton>
        ))}
      </Toolbar>
    </AppBar>
  );

  return (
    <>
      {/* Main navigation drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 240,
            backgroundColor: '#1e1e1e',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
            boxSizing: 'border-box',
            boxShadow: isMobile ? '4px 0 10px rgba(0,0,0,0.25)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            paddingTop: '0',
          },
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        }}
        ModalProps={{
          keepMounted: true
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Bottom navigation for mobile */}
      {mobileNavBar}
    </>
  );
};

export default Navigation;