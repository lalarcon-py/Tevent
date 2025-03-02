// frontend/src/components/LootManagement/LootManagement.jsx
import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import { useGuild } from '../../contexts/GuildContext';
import ItemsTab from './ItemsTab';
import WaitlistTab from './WaitlistTab';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { guildSettings, loading } = useGuild();
  
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'white' }}>
        Guild Storage Management
      </Typography>
      
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { backgroundColor: '#90caf9' },
          '& .MuiTab-root': { color: 'white' },
          '& .Mui-selected': { color: '#90caf9' }
        }}
      >
        <Tab label="Items" />
        <Tab label="Waitlist" />
      </Tabs>
      
      {currentTab === 0 && <ItemsTab dkpEnabled={guildSettings.dkpEnabled} />}
      {currentTab === 1 && <WaitlistTab dkpEnabled={guildSettings.dkpEnabled} />}
    </Box>
  );
};

export default LootManagement;