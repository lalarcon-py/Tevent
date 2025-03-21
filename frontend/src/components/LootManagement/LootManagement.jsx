// src/components/LootManagement/LootManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import AdminLootPanel from './AdminLootPanel';
import WaitListTab from './WaitListTab';
import LootRequestForm from './LootRequestForm';
import LootWaitlist from './LootWaitlist';
import WishlistTab from './WishlistTab';
import RollHistoryTab from './RollHistoryTab'; 
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import axiosInstance from '../../config/axios';
import { useGuildSettings } from '../../contexts/GuildSettingsContext';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { settings } = useGuildSettings();
  const { isAuthenticated, user } = useAuth();
  const { simulatedRole } = useSimulatedRole();
  const [directDkpCheck, setDirectDkpCheck] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Create a refresh function that updates the trigger state
  const refreshData = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Debug logging for role issues
  useEffect(() => {
    // Log role information to help diagnose issues
    const roleInfo = {
      userObj: user,
      userRole: user?.role,
      simulatedRole: simulatedRole,
      effectiveRole: simulatedRole || (user ? user.role : null),
      isAdmin: (simulatedRole || (user ? user.role : null)) && 
              ['Guild Master', 'Guild Advisor'].includes(simulatedRole || (user ? user.role : null))
    };
    
    console.log('LootManagement Role Debug:', roleInfo);
    setDebugInfo(roleInfo);
  }, [user, simulatedRole]);

  // Check if user can manage items (Guild Master or Guild Advisor)
  const isItemAdmin = () => {
    if (!user) return false;
    
    // Get the effective role (considering any simulation)
    const effectiveRole = simulatedRole || user.role;
    
    // Normalize role strings for case-insensitive comparison
    const normalizedRole = effectiveRole ? effectiveRole.toLowerCase().trim() : '';
    
    // Check against normalized role values
    return ['guild master', 'guild advisor'].includes(normalizedRole);
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

  // Check permissions to show AdminLootPanel vs LootRequestForm
  const showAdminPanel = isItemAdmin();

  // Add this debug logging inside the component
  console.log('LootManagement render:', {
    showAdminPanel,
    userRole: user?.role,
    simulatedRole,
    effectiveRole: simulatedRole || user?.role
  });

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
        <Tab label="Roll History" />
      </Tabs>

      <Box sx={{ display: currentTab !== 0 ? 'none' : 'block' }}>
        {showAdminPanel ? (
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
        {isItemAdmin() || (simulatedRole || user?.role) === 'Guild Guardian' ? (
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

      <Box sx={{ display: currentTab !== 3 ? 'none' : 'block' }}>
        <RollHistoryTab 
          key={`roll-history-tab-${String(dkpEnabled)}-${refreshKey}`} 
          refreshData={refreshData}
        />
      </Box>
    </Box>
  );
};

export default LootManagement;