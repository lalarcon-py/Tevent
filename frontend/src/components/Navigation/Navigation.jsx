// src/components/Navigation/Navigation.jsx
import { Link, useParams } from 'react-router-dom';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  useTheme,
  useMediaQuery,
  Box,
  Divider,
  ListItemIcon
} from '@mui/material';
import GuildHeader from './GuildHeader';
import LogoutButton from '../Auth/LogoutButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { useEffect, useState } from 'react';

const Navigation = ({ guildId: propGuildId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { guildId: paramGuildId } = useParams(); // Get from URL params
  const [currentGuildId, setCurrentGuildId] = useState(null);
  
  useEffect(() => {
    // Use guildId from props, then from URL params, then from localStorage
    const storedGuildId = localStorage.getItem('guildId');
    const effectiveGuildId = propGuildId || paramGuildId || storedGuildId;
    
    // Only set if it's a valid string and not 'undefined'
    if (effectiveGuildId && effectiveGuildId !== 'undefined') {
      setCurrentGuildId(effectiveGuildId);
    }
  }, [propGuildId, paramGuildId]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: 240,
          boxSizing: 'border-box',
          top: isMobile ? 56 : 64,
          height: isMobile ? 'calc(100% - 56px)' : 'calc(100% - 64px)',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1a1a 100%)',
          borderRight: 'none'
        },
      }}
    >
      <GuildHeader />
      <List sx={{ pt: 2 }}>
        <ListItem button component={Link} to="/" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Dashboard" sx={{ color: 'white' }} />
        </ListItem>
        
        <ListItem button component={Link} to="/guild-management" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Guild Management" sx={{ color: 'white' }} />
        </ListItem>
        
        <ListItem button component={Link} to="/loot-management" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Loot Management" sx={{ color: 'white' }} />
        </ListItem>
        
        <ListItem button component={Link} to="/gear-check" sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}>
          <ListItemText primary="Gear Check" sx={{ color: 'white' }} />
        </ListItem>
        
        <ListItem 
          button 
          component={Link} 
          to="/event-planner" 
          sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}
        >
          <ListItemText primary="Event Planner" sx={{ color: 'white' }} />
        </ListItem>
        
        <ListItem 
          button 
          component={Link} 
          to="/event-summaries" 
          sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}
        >
          <ListItemText primary="Current Events" sx={{ color: 'white' }} />
        </ListItem>
        
        {/* Add a flexible spacer to push remaining items to the bottom */}
        <Box sx={{ flexGrow: 1, minHeight: '20px' }} /> 
        
        {/* First divider before settings */}
        <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        
        {/* Guild Settings button at bottom (before logout) */}
        {currentGuildId && (
          <ListItem 
            button 
            component={Link} 
            to={`/guilds/${currentGuildId}/settings`} 
            sx={{ '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' } }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Guild Settings" sx={{ color: 'white' }} />
          </ListItem>
        )}
        
        {/* Second divider before logout */}
        <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        
        {/* Add the logout button at the very bottom */}
        <ListItem>
          <LogoutButton fullWidth variant="text" sx={{ color: '#ff6b6b' }} />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Navigation;