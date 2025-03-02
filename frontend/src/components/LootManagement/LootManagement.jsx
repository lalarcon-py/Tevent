// components/LootManagement/LootManagement.jsx - Complete component
import { useState, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import AdminLootPanel from './AdminLootPanel';
import WaitListTab from './WaitListTab';
import AttendanceManagement from './AttendanceManagement';
import LootRequestForm from './LootRequestForm';
import LootWaitlist from './LootWaitlist';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { isAuthenticated } = useAuth();
  const [dkpEnabled, setDkpEnabled] = useState(null);
  
  // Check if user is admin - this would typically come from your auth context
  const isAdmin = true;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Get current guild ID from URL
        const pathParts = window.location.pathname.split('/');
        const guildIdIndex = pathParts.indexOf('guilds') + 1;
        const guildId = guildIdIndex > 0 && guildIdIndex < pathParts.length 
          ? pathParts[guildIdIndex]
          : null;
          
        if (guildId) {
          const response = await axiosInstance.get(`/api/guilds/${guildId}/settings`);
          console.log('Settings fetched:', response.data);
          // Set DKP enabled state
          setDkpEnabled(response.data.dkpEnabled !== false);
        } else {
          // If no guild ID is found, default to enabled
          setDkpEnabled(true);
        }
      } catch (error) {
        console.error('Failed to fetch guild settings:', error);
        // Default to true if there's an error (backward compatibility)
        setDkpEnabled(true);
      }
    };
    
    fetchSettings();
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (dkpEnabled === null) {
        console.warn('Settings fetch timed out, defaulting to DKP enabled');
        setDkpEnabled(true);
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, []);

  // If settings haven't loaded yet, just default to enabled to avoid the spinner
  const effectiveDkpEnabled = dkpEnabled === null ? true : dkpEnabled;

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs 
        value={currentTab} 
        onChange={(_, newValue) => setCurrentTab(newValue)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: 'rgba(255,255,255,0.7)',
            '&.Mui-selected': {
              color: '#90caf9'
            }
          }
        }}
      >
        <Tab label="Item Storage" />
        <Tab label="Requests" />
      </Tabs>

      <Box sx={{ display: currentTab !== 0 ? 'none' : 'block' }}>
        {isAdmin ? (
          <AdminLootPanel dkpEnabled={effectiveDkpEnabled} />
        ) : (
          <LootRequestForm dkpEnabled={effectiveDkpEnabled} />
        )}
      </Box>
      
      <Box sx={{ display: currentTab !== 1 ? 'none' : 'block' }}>
        {isAdmin ? (
          <WaitListTab dkpEnabled={effectiveDkpEnabled} />
        ) : (
          <LootRequestForm dkpEnabled={effectiveDkpEnabled} />
        )}
      </Box>
      
      <Box sx={{ display: currentTab !== 2 ? 'none' : 'block' }}>
        {isAdmin ? (
          <AttendanceManagement dkpEnabled={effectiveDkpEnabled} />
        ) : (
          <LootWaitlist dkpEnabled={effectiveDkpEnabled} />
        )}
      </Box>
    </Box>
  );
};

export default LootManagement;