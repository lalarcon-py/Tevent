// components/LootManagement/LootManagement.jsx - Complete component
import { useState, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import AdminLootPanel from './AdminLootPanel';
import WaitListTab from './WaitListTab';
import AttendanceManagement from './AttendanceManagement';
import LootRequestForm from './LootRequestForm';
import LootWaitlist from './LootWaitlist';
import WishlistTab from './WishlistTab';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const [dkpEnabled, setDkpEnabled] = useState(false);
  const [directDkpCheck, setDirectDkpCheck] = useState(null);
  
  const isAdmin = user && ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(user.role);

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
        setDkpEnabled(response.data.dkpEnabled);
      } catch (error) {
        console.error('Direct DKP check failed:', error);
      }
    };
    
    checkDkpDirectly();
  }, []);

  const effectiveDkpEnabled = directDkpCheck?.dkpEnabled === true ? true : dkpEnabled === true;

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
          {isAdmin ? (
            <AdminLootPanel key={`admin-panel-${String(effectiveDkpEnabled)}`} dkpEnabled={Boolean(effectiveDkpEnabled)}  />
          ) : (
            <LootRequestForm key={`request-form-${effectiveDkpEnabled}`} dkpEnabled={effectiveDkpEnabled} />
          )}
        </Box>

        <Box sx={{ display: currentTab !== 1 ? 'none' : 'block' }}>
          {isAdmin ? (
            <WaitListTab key={`waitlist-tab-${String(effectiveDkpEnabled)}`} dkpEnabled={Boolean(effectiveDkpEnabled)} />
          ) : (
            <LootRequestForm key={`request-form-tab-${effectiveDkpEnabled}`} dkpEnabled={effectiveDkpEnabled} />
          )}
        </Box>
      
      <Box sx={{ display: currentTab !== 2 ? 'none' : 'block' }}>
        {isAdmin ? (
          <AttendanceManagement dkpEnabled={effectiveDkpEnabled} />
        ) : (
          <LootWaitlist dkpEnabled={effectiveDkpEnabled} />
        )}
      </Box>

      {/* Add this new Box for the Wishlist tab */}
      <Box sx={{ display: currentTab !== 3 ? 'none' : 'block' }}>
        <WishlistTab />
      </Box>
    </Box>
  );
};

export default LootManagement;