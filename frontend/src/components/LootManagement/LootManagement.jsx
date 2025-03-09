// components/LootManagement/LootManagement.jsx - Fixed version
import { useState, useEffect, useCallback } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import AdminLootPanel from './AdminLootPanel';
import WaitListTab from './WaitListTab';
import LootRequestForm from './LootRequestForm';
import LootWaitlist from './LootWaitlist';
import WishlistTab from './WishlistTab';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';
import { useGuildSettings } from '../../contexts/GuildSettingsContext';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { settings } = useGuildSettings();
  const { isAuthenticated, user } = useAuth();
  const [directDkpCheck, setDirectDkpCheck] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Create a new isItemAdmin function to separate item storage admins from other admins
  const isItemAdmin = user && ['Guild Master', 'Guild Advisor'].includes(user.role);
  const isAdmin = user && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(user.role);

  // Create a refresh function that updates the trigger state
  const refreshData = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  useEffect(() => {
    // Log GuildSettings context value for debugging
    console.log('GuildSettings from context:', settings);
  }, [settings]);

  useEffect(() => {
    const checkDkpDirectly = async () => {
      try {
        // Get guild ID
        const pathParts = window.location.pathname.split('/');
        const guildIdIndex = pathParts.indexOf('guilds') + 1;
        const guildId = guildIdIndex > 0 && guildIdIndex < pathParts.length 
          ? pathParts[guildIdIndex]
          : localStorage.getItem('guildId');
        
        if (!guildId) return;
        
        console.log('Checking DKP directly for guild:', guildId);
        
        // Make direct API call
        const response = await axiosInstance.get(`/api/guilds/${guildId}/direct-dkp-check`);
        console.log('DIRECT DKP CHECK RESPONSE:', response.data);
        
        // Update DKP state directly from this check
        setDirectDkpCheck(response.data);
      } catch (error) {
        console.error('Direct DKP check failed:', error);
      }
    };
    
    if (!settings) {
      checkDkpDirectly();
    }
  }, [settings]);

  const dkpEnabled = settings?.dkpEnabled !== undefined 
    ? Boolean(settings.dkpEnabled) 
    : Boolean(directDkpCheck?.dkpEnabled);

  // Log the final determination for debugging
  useEffect(() => {
    console.log('Final DKP determination:', {
      fromContext: settings?.dkpEnabled,
      fromDirectCheck: directDkpCheck?.dkpEnabled,
      finalValue: dkpEnabled
    });
  }, [dkpEnabled, settings, directDkpCheck]);

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
        <Tab label="Wishlist" />
      </Tabs>

      <Box sx={{ display: currentTab !== 0 ? 'none' : 'block' }}>
        {isItemAdmin ? (
          <AdminLootPanel 
            key={`admin-panel-${String(dkpEnabled)}-${refreshKey}`} 
            dkpEnabled={dkpEnabled} 
            refreshData={refreshData}
          />
        ) : (
          <LootRequestForm 
            key={`request-form-${String(dkpEnabled)}-${refreshKey}`} 
            dkpEnabled={dkpEnabled}
            refreshData={refreshData}
            onRequestSubmitted={() => setCurrentTab(1)}
          />
        )}
      </Box>

      <Box sx={{ display: currentTab !== 1 ? 'none' : 'block' }}>
        {isAdmin ? (
          <WaitListTab 
            key={`waitlist-tab-${String(dkpEnabled)}-${refreshKey}`} 
            dkpEnabled={dkpEnabled}
            refreshData={refreshData}
          />
        ) : (
          <LootWaitlist 
            key={`loot-waitlist-${String(dkpEnabled)}-${refreshKey}`} 
            dkpEnabled={dkpEnabled}
            refreshData={refreshData}
          />
        )}
      </Box>
      
      <Box sx={{ display: currentTab !== 2 ? 'none' : 'block' }}>
        <WishlistTab 
          key={`wishlist-tab-${String(dkpEnabled)}-${refreshKey}`} 
          dkpEnabled={dkpEnabled}
          refreshData={refreshData}
        />
      </Box>
    </Box>
  );
};

export default LootManagement;