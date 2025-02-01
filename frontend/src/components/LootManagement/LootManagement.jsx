// components/LootManagement/LootManagement.jsx
import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import AdminLootPanel from './AdminLootPanel';
import WaitListTab from './WaitListTab';
import AttendanceManagement from './AttendanceManagement';

const LootManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);

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
        <Tab label="Loot Management" />
        <Tab label="Wait List" />
        <Tab label="Attendance" />
      </Tabs>

      <Box hidden={currentTab !== 0}>
        <AdminLootPanel />
      </Box>
      <Box hidden={currentTab !== 1}>
        <WaitListTab />
      </Box>
      <Box hidden={currentTab !== 2}>
        <AttendanceManagement />
      </Box>
    </Box>
  );
};

export default LootManagement;