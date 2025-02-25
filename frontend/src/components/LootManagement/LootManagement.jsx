import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import AdminLootPanel from './AdminLootPanel';
import WaitListTab from './WaitListTab';
import AttendanceManagement from './AttendanceManagement';
import LootRequestForm from './LootRequestForm';
import LootWaitlist from './LootWaitlist';
import { useAuth } from '../../contexts/AuthContext';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { isAuthenticated } = useAuth();
  
  // Check if user is admin - this would typically come from your auth context
  // For now we'll default to true for demonstration
  const isAdmin = true;

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
        <Tab label={isAdmin ? "Manage Attendance" : "My Waitlist"} />
      </Tabs>

      <Box sx={{ display: currentTab !== 0 ? 'none' : 'block' }}>
        {isAdmin ? (
          <AdminLootPanel />
        ) : (
          <LootRequestForm />
        )}
      </Box>
      
      <Box sx={{ display: currentTab !== 1 ? 'none' : 'block' }}>
        {isAdmin ? (
          <WaitListTab />
        ) : (
          <LootRequestForm />
        )}
      </Box>
      
      <Box sx={{ display: currentTab !== 2 ? 'none' : 'block' }}>
        {isAdmin ? (
          <AttendanceManagement />
        ) : (
          <LootWaitlist />
        )}
      </Box>
    </Box>
  );
};

export default LootManagement;