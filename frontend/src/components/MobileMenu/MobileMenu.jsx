import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Box, ListItem, ListItemIcon, ListItemText, 
  Divider, Typography, Drawer, List
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import StorageIcon from '@mui/icons-material/Storage';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DiscordIcon from '@mui/icons-material/ConnectedTv';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import axiosInstance from '../../config/axios';

const MobileMenu = ({ guildId }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [guildRole, setGuildRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [discordConnected, setDiscordConnected] = useState(false);
  const { user } = useAuth();
  const { simulatedRole } = useSimulatedRole();
  const location = useLocation();

  // Close menu when location changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  
  // Listen for the hamburger menu click event
  useEffect(() => {
    const handleHamburgerClick = () => {
      setMenuOpen(true);
    };
    
    // Custom event to handle menu open
    document.addEventListener('open-mobile-menu', handleHamburgerClick);
    
    return () => {
      document.removeEventListener('open-mobile-menu', handleHamburgerClick);
    };
  }, []);
  
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

  // Handle menu closing
  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  // Handle Discord integration
  const handleDiscordIntegration = async () => {
    handleMenuClose();
    // Your existing Discord integration code...
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

  return (
    <Drawer
      anchor="left"
      open={menuOpen}
      onClose={handleMenuClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '80%',
          maxWidth: '300px',
          boxSizing: 'border-box',
          bgcolor: '#1e1e1e',
          color: 'white'
        }
      }}
    >
      {/* Header with close button */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
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
        <Box 
          onClick={handleMenuClose}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)'
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </Box>
      </Box>
      
      {/* Guild role info */}
      <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(0,0,0,0.2)', mb: 2 }}>
        <Typography variant="caption" color="white" display="block">
          Guild Role: {loading ? 'Loading...' : (guildRole || 'None')}
        </Typography>
      </Box>
      
      {/* Menu items */}
      <List sx={{ px: 1 }}>
        {baseMenuItems.map((item) => (
          <React.Fragment key={item.text}>
            {item.onClick ? (
              <ListItem 
                button 
                onClick={() => {
                  item.onClick();
                  handleMenuClose();
                }}
                sx={{ 
                  color: location.pathname === item.path ? '#90caf9' : 'white',
                  backgroundColor: location.pathname === item.path ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                  py: 1.5,
                  px: 2,
                  borderRadius: '8px',
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path ? '#90caf9' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: 40
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontSize: '0.95rem',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    noWrap: true
                  }}
                />
              </ListItem>
            ) : (
              <ListItem 
                button 
                component={Link}
                to={item.path}
                onClick={handleMenuClose}
                sx={{ 
                  color: location.pathname === item.path ? '#90caf9' : 'white',
                  backgroundColor: location.pathname === item.path ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                  py: 1.5,
                  px: 2,
                  borderRadius: '8px',
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path ? '#90caf9' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: 40
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontSize: '0.95rem',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    noWrap: true
                  }}
                />
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
      
      {/* Spacer */}
      <Box sx={{ flexGrow: 1 }} />
      
      {/* Bottom menu items */}
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', my: 2 }} />
      
      <List sx={{ px: 1 }}>
        {/* Settings */}
        <ListItem 
          button 
          component={Link}
          to={guildId ? `/guilds/${guildId}/settings` : '/settings'}
          onClick={handleMenuClose}
          sx={{ 
            color: location.pathname.includes('/settings') ? '#90caf9' : 'white',
            backgroundColor: location.pathname.includes('/settings') ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
            py: 1.5,
            px: 2,
            borderRadius: '8px',
            mb: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)'
            }
          }}
        >
          <ListItemIcon sx={{ 
            color: location.pathname.includes('/settings') ? '#90caf9' : 'rgba(255, 255, 255, 0.7)',
            minWidth: 40
          }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Guild Settings" 
            primaryTypographyProps={{ 
              fontSize: '0.95rem',
              fontWeight: location.pathname.includes('/settings') ? 'bold' : 'normal',
              noWrap: true
            }}
          />
        </ListItem>

        {/* Logout */}
        <ListItem 
          button
          onClick={async () => {
            handleMenuClose();
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
            px: 2,
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)'
            }
          }}
        >
          <ListItemIcon sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: 40
          }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{ 
              fontSize: '0.95rem',
              noWrap: true
            }}
          />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default MobileMenu;