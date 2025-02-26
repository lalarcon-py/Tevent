// frontend/src/components/GuildSwitcher.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Divider 
} from '@mui/material';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import axiosInstance from '../config/axios';

const GuildSwitcher = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [userGuilds, setUserGuilds] = useState([]);
  const [currentGuildId, setCurrentGuildId] = useState(null);
  
  useEffect(() => {
    // Extract current guild ID from URL
    const pathParts = window.location.pathname.split('/');
    const guildIdIndex = pathParts.indexOf('guilds') + 1;
    if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
      setCurrentGuildId(pathParts[guildIdIndex]);
    }
    
    // Fetch user's guilds
    const fetchUserGuilds = async () => {
      try {
        const response = await axiosInstance.get('/api/guilds/my-guilds');
        setUserGuilds(response.data);
      } catch (error) {
        console.error('Failed to fetch user guilds:', error);
      }
    };
    
    fetchUserGuilds();
  }, []);
  
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  const handleSwitchGuild = (guildId) => {
    window.location.href = `/guilds/${guildId}/dashboard`;
    handleCloseMenu();
  };
  
  return (
    <Box>
      <IconButton 
        onClick={handleOpenMenu}
        sx={{ 
          color: 'white',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
        }}
      >
        <SwitchAccountIcon />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        sx={{ mt: 1 }}
      >
        <Typography sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Switch Guild
        </Typography>
        <Divider />
        
        {userGuilds.map(guild => (
          <MenuItem 
            key={guild.id} 
            onClick={() => handleSwitchGuild(guild.id)}
            selected={guild.id === currentGuildId}
          >
            <ListItemAvatar>
              <Avatar>{guild.name[0]}</Avatar>
            </ListItemAvatar>
            <ListItemText 
              primary={guild.name}
              secondary={`Role: ${guild.role}`}
            />
          </MenuItem>
        ))}
        
        <Divider />
        <MenuItem onClick={() => window.location.href = '/guilds/setup'}>
          <ListItemText primary="Join or Create Guild" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default GuildSwitcher;