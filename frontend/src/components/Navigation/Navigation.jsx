// components/Navigation/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { 
  Drawer, List, ListItem, ListItemIcon, ListItemText, 
  Divider, IconButton, Box, useMediaQuery, useTheme,
  AppBar, Toolbar, Typography, Button
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const [guildRole, setGuildRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [discordConnected, setDiscordConnected] = useState(false);
  
  // Debug function to log state of various values
  const debugLog = (message, data) => {
    console.log(`🔍 DEBUG [${new Date().toISOString()}]: ${message}`, data);
  };
  
  // Fetch the user's guild-specific role and Discord connection status
  // Fetch the user's guild-specific role and Discord connection status
  useEffect(() => {
    const fetchGuildData = async () => {
      if (!user) {
        return;
      }
      
      try {
        setLoading(true);
        
        // Get guild ID - try from props first, then localStorage
        const currentGuildId = guildId || localStorage.getItem('guildId');
        
        if (!currentGuildId) {
          setLoading(false);
          return;
        }
        
        // Fetch guild members
        const response = await axiosInstance.get(`/api/guilds/${currentGuildId}/members`);
        
        // Find current user in members list
        const currentMember = response.data.find(member => member.id === user.id);
        
        if (currentMember) {
          setGuildRole(currentMember.role);
          
          // SIMPLIFIED DISCORD CONNECTION CHECK
          // Direct check using the dedicated endpoint
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

  // Fixed Discord integration function with extensive debugging
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
      
      // Get Discord client ID
      const clientId = await getDiscordClientId();
      debugLog('Discord client ID', clientId);
      
      if (!clientId) {
        alert('Could not retrieve Discord client ID. Please try again later or contact support.');
        return;
      }
      
      // Create and open Discord OAuth URL
      const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=2147485696&scope=bot%20applications.commands`;
      window.open(discordUrl, '_blank');
      
      // Show instructions
      setTimeout(() => {
        alert(`After adding the bot to your Discord server, use this command:\n\n/link-guild join_code:${joinCode}`);
      }, 500);
    } catch (error) {
      debugLog('Error in Discord integration', error);
      alert('Could not connect to Discord. Please try again later.');
    }
  };
  
  // Check role permissions
  const isGuildMaster = guildRole === 'Guild Master';
  const isAdvisorOrMaster = ['Guild Master', 'Guild Advisor'].includes(guildRole);
  const hasDashboardAccess = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(guildRole);

  // Create base menu items - start with an empty array
  const baseMenuItems = [];
  
  // Add Dashboard only for those with access
  if (hasDashboardAccess) {
    baseMenuItems.push({
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    });
  }
  
  // Add other menu items that are available to all guild members
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
  
  // Add conditional menu items
  if (isAdvisorOrMaster) {
    baseMenuItems.push({
      text: 'Guild Applications',
      icon: <PersonAddIcon />,
      path: '/applications'
    });
  }
  
  // Add billing for Guild Master only
  if (isGuildMaster) {
    baseMenuItems.push({
      text: 'Billing',
      icon: <ReceiptIcon />,
      path: '/billing'
    });
    
    // For debugging, log the Discord connected state that affects the menu
    debugLog('Discord connection state for menu item', discordConnected);
    
    // Add Discord menu item conditionally based on connection status
    if (discordConnected) {
      baseMenuItems.push({
        text: 'Discord Settings',
        icon: <DiscordIcon />,
        path: '/discord/settings'
      });
    } else {
      baseMenuItems.push({
        text: 'Connect Discord',
        icon: <DiscordIcon />,
        onClick: handleDiscordIntegration
      });
    }
  }

  const drawer = (
    <>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 1,
        ...isMobile ? { py: 2 } : {}
      }}>
        <Typography variant="h6" sx={{ ml: 2, color: 'white' }}>
          Guild Manager
        </Typography>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
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
        <Typography variant="caption" color="text.secondary" display="block">
          Discord: {loading ? 'Loading...' : (discordConnected ? '✅ Connected' : '❌ Not Connected')}
        </Typography>
        {isGuildMaster && (
          <Typography variant="caption" color="text.secondary" display="block">
            Client ID: {process.env.REACT_APP_DISCORD_CLIENT_ID ? '✅ Set' : '❌ Missing'}
          </Typography>
        )}
      </Box>
      
      {/* Main menu items */}
      <List sx={{ py: 2 }}>
          {baseMenuItems.map((item) => (
            <ListItem 
              button 
              component={item.onClick ? 'div' : Link} // Use div if we have an onClick handler
              to={!item.onClick ? item.path : undefined} // Only use "to" if no onClick
              onClick={item.onClick} // Add onClick handler
              key={item.text}
              sx={{ 
                color: location.pathname === item.path ? '#90caf9' : 'white',
                backgroundColor: location.pathname === item.path ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                py: 1.5,
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
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                }}
              />
            </ListItem>
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
              fontWeight: location.pathname.includes('/settings') ? 'bold' : 'normal'
            }}
          />
        </ListItem>
        
        <ListItem
          button
          component={LogoutButton}
          variant="text"
          color="inherit"
          sx={{ 
            color: 'white',
            py: 1.5,
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
              fontSize: isMobile ? '0.95rem' : '1rem'
            }}
          />
        </ListItem>
      </List>
    </>
  );

  // Mobile Navigation Bar - only show 4 primary icons
  const mobileNavBar = isMobile && (
    <AppBar
      position="fixed"
      sx={{
        display: { sm: 'none' },
        top: 'auto',
        bottom: 0,
        bgcolor: '#1a1a1a',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-around', minHeight: '56px', px: 1 }}>
        {baseMenuItems.slice(0, 4).map((item) => (
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
              {item.text.split(' ')[0]} {/* Just show first word */}
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
            height: '100%'
          },
        }}
        ModalProps={{
          keepMounted: true // Better mobile performance
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