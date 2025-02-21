import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Box,
  CircularProgress 
} from '@mui/material';
import { useLoot } from '../../contexts/LootContext';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const LootWaitlist = () => {
  const { requests, loadRequests } = useLoot();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      const initialLoad = async () => {
        try {
          await loadRequests();
        } finally {
          setLoading(false);
        }
      };
      initialLoad();
    }
  }, [isAuthenticated, loadRequests]);

  const getRarityColor = (rarity) => {
    switch(rarity?.toLowerCase()) {
      case 'legendary': return '#ff8c00';
      case 'epic': return '#9932cc';
      case 'rare': return '#4169e1';
      case 'uncommon': return '#32cd32';
      case 'common': return '#808080';
      default: return 'white';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ 
      mt: 4,
      bgcolor: 'rgba(30, 30, 30, 0.7)',
      backdropFilter: 'blur(10px)'
    }}>
      <Typography variant="h5" sx={{ 
        color: '#f48fb1', 
        p: 2,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        Item Waitlist
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#90caf9' }}>Item</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Type</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Your Position</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>DKP Priority</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request, index) => (
              <TableRow key={request.id}>
                <TableCell sx={{ color: 'white' }}>
                  {request?.StorageItem?.Item?.name || 'Unknown Item'}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {request?.StorageItem?.Item?.type || 'Unknown Type'}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>#{index + 1}</TableCell>
                <TableCell sx={{ color: 'white' }}>{request?.priority || 0} DKP</TableCell>
                <TableCell sx={{ 
                  color: request?.status === 'Approved' ? '#4caf50' : 
                         request?.status === 'Denied' ? '#f44336' : '#ffb74d'
                }}>
                  {request?.status || 'Pending'}
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'white', textAlign: 'center' }}>
                  No items in your waitlist
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LootWaitlist;