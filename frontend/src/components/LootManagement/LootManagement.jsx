import { useState, lazy, Suspense } from 'react';
import { Tabs, Tab, Box, CircularProgress } from '@mui/material';

const AdminLootPanel = lazy(() => import('./AdminLootPanel'));
const WaitListTab = lazy(() => import('./WaitListTab'));

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
      </Tabs>

      <Suspense fallback={<CircularProgress />}>
        {currentTab === 0 && <AdminLootPanel />}
        {currentTab === 1 && <WaitListTab />}
      </Suspense>
    </Box>
  );
};

export default LootManagement;