import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../../config/axios.js';
import { useAuth } from '../../contexts/AuthContext';

const WaitListTab = ({ dkpEnabled }) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated]);

  // Debug function to see what we're getting
  useEffect(() => {
    if (requests.length > 0) {
      console.log('First request data:', requests[0]);
    }
  }, [requests]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        setLoading(false);
        return;
      }
      
      const response = await axiosInstance.get(`/api/waitlist?guildId=${guildId}`);
      
      if (response.data && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setRequests([]);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
      setError('Failed to load item requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    setConfirmDialog({
      open: true,
      title: 'Approve Request',
      message: `Are you sure you want to approve ${request?.user?.username || 'this user'}'s request for ${getItemName(request) || 'this item'}?`,
      action: async () => {
        try {
          const guildId = localStorage.getItem('guildId');
          if (!guildId) {
            console.error('No guild ID found');
            return;
          }
          await axiosInstance.put(`/api/request/${request.id}`, { status: 'Approved', guildId });
          await loadRequests();
        } catch (error) {
          console.error('Failed to approve request:', error);
          setError('Failed to approve request');
        }
      }
    });
  };

  const handleDeny = async (request) => {
    setConfirmDialog({
      open: true,
      title: 'Deny Request',
      message: `Are you sure you want to deny ${request?.user?.username || 'this user'}'s request for ${getItemName(request) || 'this item'}?`,
      action: async () => {
        try {
          const guildId = localStorage.getItem('guildId');
          if (!guildId) {
            console.error('No guild ID found');
            return;
          }
          await axiosInstance.put(`/api/request/${request.id}`, { status: 'Denied', guildId });
          await loadRequests();
        } catch (error) {
          console.error('Failed to deny request:', error);
          setError('Failed to deny request');
        }
      }
    });
  };

  const handleDelete = async (request) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Request',
      message: `Are you sure you want to delete ${request?.user?.username || 'this user'}'s request for ${getItemName(request) || 'this item'}?`,
      action: async () => {
        try {
          const guildId = localStorage.getItem('guildId');
          if (!guildId) {
            console.error('No guild ID found');
            return;
          }
          await axiosInstance.delete(`/api/request/${request.id}?guildId=${guildId}`);
          await loadRequests();
        } catch (error) {
          console.error('Failed to delete request:', error);
          setError('Failed to delete request');
        }
      }
    });
  };

  // Helper functions to extract data consistently
  const getStorageItem = (request) => {
    return request?.storageItem || request?.StorageItem;
  };

  const getItem = (storageItem) => {
    return storageItem?.item || storageItem?.Item;
  };

  const getItemName = (request) => {
    const storageItem = getStorageItem(request);
    const item = getItem(storageItem);
    return item?.name || 'Unknown Item';
  };

  const getItemType = (request) => {
    const storageItem = getStorageItem(request);
    const item = getItem(storageItem);
    return item?.type || 'Unknown';
  };

  const getItemIcon = (request) => {
    const storageItem = getStorageItem(request);
    const item = getItem(storageItem);
    return item?.icon || null;
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
        <Button 
          variant="contained" 
          color="primary" 
          onClick={loadRequests} 
          sx={{ mt: 2 }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{
        p: 4,
        background: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(12px)'
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#90caf9' }}>
          Item Requests
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1a1a1a' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Item</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Player</TableCell>
                {/* Only show DKP column if DKP is enabled */}
                {dkpEnabled && (
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>DKP</TableCell>
                )}
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', borderBottom: '2px solid #90caf9' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((request) => {
                  const storageItem = getStorageItem(request);
                  
                  return (
                    <TableRow 
                      key={request.id}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'rgba(144, 202, 249, 0.1)',
                          transform: 'scale(1.02)',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={getItemIcon(request)} 
                            sx={{ 
                              width: 40, 
                              height: 40,
                              border: '2px solid #90caf9'
                            }}
                          >
                            {getItemName(request)?.[0] || '?'}
                          </Avatar>
                          <Box>
                            <Typography sx={{ color: 'white' }}>
                              {getItemName(request)}
                            </Typography>
                            {storageItem && storageItem.trait && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: '#90caf9',
                                  mt: 0.5,
                                  display: 'block',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {storageItem.trait}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white' }}>
                        {getItemType(request)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={request.user ? request.user.avatar_url : null} 
                            sx={{ 
                              width: 40, 
                              height: 40,
                              border: '2px solid #90caf9'
                            }}
                          >
                            {request.user && request.user.username ? request.user.username[0] : '?'}
                          </Avatar>
                          <Typography sx={{ color: 'white' }}>
                            {request.user ? request.user.username : 'Unknown User'}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      {/* Only show DKP cell if DKP is enabled */}
                      {dkpEnabled && (
                        <TableCell sx={{ color: 'white' }}>{request.priority || 0}</TableCell>
                      )}
                      
                      <TableCell>
                        <Typography sx={{ 
                          color: request.status === 'Approved' ? '#4caf50' : 
                                 request.status === 'Denied' ? '#f44336' : '#ffb74d'
                        }}>
                          {request.status || 'Pending'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {request.status === 'Pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  onClick={() => handleApprove(request)}
                                  sx={{
                                    color: '#4caf50',
                                    '&:hover': { transform: 'scale(1.1)' }
                                  }}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deny">
                                <IconButton
                                  onClick={() => handleDeny(request)}
                                  sx={{
                                    color: '#f44336',
                                    '&:hover': { transform: 'scale(1.1)' }
                                  }}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => handleDelete(request)}
                              sx={{
                                color: '#757575',
                                '&:hover': { 
                                  color: '#f44336',
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={dkpEnabled ? 6 : 5} sx={{ textAlign: 'center', color: 'white', py: 3 }}>
                    No item requests available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
     
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>{confirmDialog.message}</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              confirmDialog.action?.();
              setConfirmDialog({ ...confirmDialog, open: false });
            }}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaitListTab;