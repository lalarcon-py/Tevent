// components/Navigation/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { 
  Drawer, List, ListItem, ListItemIcon, ListItemText, 
  Divider, IconButton, Box, useMediaQuery, useTheme,
  AppBar, Toolbar, Typography, Button
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
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

const Navigation = ({ guildId }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  
  // Close mobile drawer when route changes
  useEffect(() => {
    if (isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile, mobileOpen]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/'
    },
    {
      text: 'Guild Management',
      icon: <GroupIcon />,
      path: '/guild-management'
    },
    {
      text: 'Guild Applications',
      icon: <PersonAddIcon />,
      path: '/applications',
      condition: user => !user || ['Guild Master', 'Guild Advisor'].includes(user.role)
    },
    {
      text: 'Loot Management',
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
    
  ];

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
      
      {/* Main menu items */}
      <List sx={{ py: 2 }}>
        {menuItems.map((item) => (
          <ListItem 
            button 
            component={Link} 
            to={item.path}
            key={item.text}
            sx={{ 
              color: location.pathname === item.path ? '#90caf9' : 'white',
              backgroundColor: location.pathname === item.path ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
              py: 1.5, // Increased vertical padding for more spacing
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
        {menuItems.slice(0, 4).map((item) => (
          <IconButton
            key={item.text}
            component={Link}
            to={item.path}
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
        
        {/* Add the hamburger menu to show full navigation */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="end"
          onClick={handleDrawerToggle}
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            fontSize: '0.6rem'
          }}
        >
          <MenuIcon />
          <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
            Menu
          </Typography>
        </IconButton>
      </Toolbar>
    </AppBar>
  );

  return (
    <>
      {/* Mobile hamburger menu - moved inside the drawer */}
      {/* We don't need a separate button since we have one in mobile nav bar */}
      
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