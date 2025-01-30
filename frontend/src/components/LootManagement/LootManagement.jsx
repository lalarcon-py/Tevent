import { Box, Typography } from '@mui/material';
import LootRequestForm from './LootRequestForm';
import LootWaitlist from './LootWaitlist';
import AdminLootPanel from './AdminLootPanel';
import { useLoot } from '../../contexts/LootContext';

const LootManagement = () => {
  const { isAdmin } = useLoot();

  return (
    <Box sx={{ 
      p: 4,
      background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1a1a 100%)',
      minHeight: '100vh'
    }}>
      <Typography variant="h3" sx={{ 
        color: '#90caf9', 
        mb: 4,
        fontFamily: 'Arial, sans-serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
      }}>
        Loot Management
      </Typography>
      
      <LootRequestForm />
      
      <Box sx={{ mt: 6 }}>
        {isAdmin ? (
          <AdminLootPanel />
        ) : (
          <LootWaitlist />
        )}
      </Box>
    </Box>
  );
};

export default LootManagement;