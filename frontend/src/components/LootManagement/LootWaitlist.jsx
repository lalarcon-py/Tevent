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
  CircularProgress,
  Avatar,
  Chip
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';

const LootWaitlist = () => {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/api/waitlist');
      
      if (response.data && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setRequests([]);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      setError('Failed to load your waitlist items. Please try again later.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <Box sx={{ p: 3, color: 'error.main', textAlign: 'center' }}>
        <Typography>{error}</Typography>
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
        My Item Waitlist
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#90caf9' }}>Item</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Type</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Position</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>DKP Priority</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length > 0 ? (
              requests.map((request, index) => (
                <TableRow key={request.id}>
                  <TableCell sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={(request.StorageItem && request.StorageItem.Item) ? request.StorageItem.Item.icon : null}
                        sx={{ width: 40, height: 40 }}
                      >
                        {!request.StorageItem?.Item?.icon && (request.StorageItem?.Item?.name?.[0] || '?')}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: 'white', fontWeight: 'medium' }}>
                          {(request.StorageItem && request.StorageItem.Item) ? request.StorageItem.Item.name : 'Unknown Item'}
                        </Typography>
                        {request.StorageItem?.trait && (
                          <Typography variant="caption" sx={{ color: '#90caf9' }}>
                            {request.StorageItem.trait}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {request.StorageItem?.Item?.type || 'Unknown Type'}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>#{index + 1}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{request.priority || 0} DKP</TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status || 'Pending'}
                      sx={{ 
                        bgcolor: request.status === 'Approved' ? 'rgba(76, 175, 80, 0.2)' : 
                                 request.status === 'Denied' ? 'rgba(244, 67, 54, 0.2)' : 
                                 'rgba(255, 183, 77, 0.2)',
                        color: request.status === 'Approved' ? '#4caf50' : 
                               request.status === 'Denied' ? '#f44336' : '#ffb74d',
                        fontWeight: 'medium'
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'white', textAlign: 'center', p: 3 }}>
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