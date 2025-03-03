// frontend/src/components/Guild/GuildNavigation.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Menu, 
  MenuItem, 
  Typography, 
  IconButton
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SyncIcon from '@mui/icons-material/Sync';
import axiosInstance from '../../config/axios';


const GuildNavigation = () => {
  const [guilds, setGuilds] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchGuilds = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/guilds/my-guilds');
      setGuilds(response.data);
      
      // Get current guild ID from localStorage or URL
      let currentGuildId = null;
      
      // Try from URL first
      const pathParts = window.location.pathname.split('/');
      const guildIdIndex = pathParts.indexOf('guilds') + 1;
      if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
        currentGuildId = pathParts[guildIdIndex];
      }
      
      // If not in URL, try localStorage
      if (!currentGuildId) {
        try {
          currentGuildId = localStorage.getItem('guildId');
        } catch (e) {
          console.warn('Failed to access localStorage:', e);
        }
      }
      
      // Set current guild
      if (currentGuildId) {
        const found = response.data.find(g => g.id === currentGuildId);
        setCurrentGuild(found || response.data[0]);
      } else if (response.data.length > 0) {
        setCurrentGuild(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchGuilds();
  }, []);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleGuildChange = (guild) => {
    setCurrentGuild(guild);
    
    // Update localStorage
    try {
      localStorage.setItem('guildId', guild.id);
    } catch (e) {
      console.warn('Failed to update localStorage:', e);
    }
    
    // Redirect to new guild dashboard
    window.location.href = `/guilds/${guild.id}/dashboard`;
    
    handleClose();
  };
  
  if (!currentGuild) {
    return null;
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      mx: 2
    }}>
      <Button
        onClick={handleClick}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          color: 'white',
          fontWeight: 'bold',
          textTransform: 'none'
        }}
      >
        {currentGuild.name}
      </Button>
      
      <IconButton 
        size="small" 
        onClick={fetchGuilds}
        disabled={loading}
        sx={{ color: 'white', ml: 1 }}
      >
        <SyncIcon fontSize="small" />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Your Guilds
        </Typography>
        
        {guilds.map(guild => (
          <MenuItem 
            key={guild.id} 
            onClick={() => handleGuildChange(guild)}
            selected={guild.id === currentGuild.id}
          >
            {guild.name}
          </MenuItem>
        ))}
        
        <MenuItem 
          onClick={() => {
            handleClose();
            window.location.href = '/guilds/setup';
          }}
          sx={{ borderTop: '1px solid rgba(0, 0, 0, 0.12)', mt: 1 }}
        >
          Join or Create Guild
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default GuildNavigation;