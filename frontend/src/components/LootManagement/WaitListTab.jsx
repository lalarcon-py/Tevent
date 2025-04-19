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
  CircularProgress,
  Chip,
  Badge,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CasinoIcon from '@mui/icons-material/Casino';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimerIcon from '@mui/icons-material/Timer';
import axiosInstance from '../../config/axios.js';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import RollTypeEditor from './RollTypeEditor';

const WaitListTab = ({ dkpEnabled, refreshData }) => {
  const { isAuthenticated, user } = useAuth();
  const { simulatedRole } = useSimulatedRole();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRolls, setTriggeringRolls] = useState(false);

  // Update current time every minute to refresh timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Add permission check helper function - updated to use effective role
  const hasApprovalPermission = () => {
    if (!user) return false;
    
    // Use simulated role if available, otherwise use actual role
    const effectiveRole = simulatedRole || user.role;
    return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
  };

  // Move all hooks to the top, before any conditional returns
  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated]);

  // Make sure component refreshes when the refreshTrigger changes
  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [refreshData, isAuthenticated]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        setLoading(false);
        return;
      }
      
      // Add a cache-busting parameter to force fresh data
      const timestamp = new Date().getTime();
      const response = await axiosInstance.get(`/api/waitlist?guildId=${guildId}&_t=${timestamp}`);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Waitlist data received:', response.data);
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

  // Function to trigger roll check manually
  const triggerRollCheck = async () => {
    try {
      setTriggeringRolls(true);
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      // Call the roll check endpoint
      const response = await axiosInstance.post(`/api/guild-storage/debug/check-rolls`, {
        guildId
      });
      
      console.log('Roll check response:', response.data);
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Roll check triggered successfully! Please refresh to see results.',
        severity: 'success'
      });
      
      // Wait a short delay to allow backend processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh data
      await loadRequests();
      
      // If parent has refresh function, call it too
      if (refreshData) refreshData();
      
    } catch (error) {
      console.error('Failed to trigger roll check:', error);
      setNotification({
        open: true,
        message: 'Failed to trigger roll check. Please try again.',
        severity: 'error'
      });
    } finally {
      setTriggeringRolls(false);
    }
  };

  // Format remaining time until roll
  const formatRemainingTime = (createdAt, timerDuration) => {
    if (!createdAt || !timerDuration) return "Unknown";
    
    const creation = new Date(createdAt);
    const expirationTime = new Date(creation.getTime() + (timerDuration * 60000));
    const diffMs = expirationTime - now;
    
    if (diffMs <= 0) return "Expired - Roll Pending";
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Format the need/greed type for display
  const formatNeedOrGreed = (type) => {
    switch (type) {
      case 'NEED_ITEM': return "Need Item";
      case 'NEED_TRAIT': return "Need Trait";
      case 'GREED': return "Greed";
      default: return "Need Item";
    }
  };

  // Get color for need/greed type
  const getNeedOrGreedColor = (type) => {
    switch (type) {
      case 'NEED_ITEM': return "#4caf50"; // Green
      case 'NEED_TRAIT': return "#2196f3"; // Blue
      case 'GREED': return "#ff9800"; // Orange
      default: return "#4caf50";
    }
  };

  // Get background color for need/greed type
  const getNeedOrGreedBgColor = (type) => {
    switch (type) {
      case 'NEED_ITEM': return "rgba(76, 175, 80, 0.2)";
      case 'NEED_TRAIT': return "rgba(33, 150, 243, 0.2)";
      case 'GREED': return "rgba(255, 152, 0, 0.2)";
      default: return "rgba(76, 175, 80, 0.2)";
    }
  };

  const handleApprove = async (request) => {
    // Check permission
    if (!hasApprovalPermission()) {
      setError('You do not have permission to approve requests');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Approve Request',
      message: `Are you sure you want to approve ${request?.user?.username || 'this user'}'s request for ${getItemName(request) || 'this item'}?`,
      action: async () => {
        try {
          setLoading(true); // Show loading indicator
          const guildId = localStorage.getItem('guildId');
          if (!guildId) {
            console.error('No guild ID found');
            return;
          }
          
          console.log('Approving request:', request.id);
          
          // Make the API call
          await axiosInstance.put(`/api/waitlist/${request.id}`, { 
            status: 'Approved', 
            guildId 
          });
          
          console.log('Request approved successfully');
          
          // Force reload data
          await loadRequests();
          
          // Also refresh parent component data
          if (refreshData) {
            refreshData();
          }
        } catch (error) {
          console.error('Failed to approve request:', error);
          setError('Failed to approve request. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeny = async (request) => {
    // Check permission
    if (!hasApprovalPermission()) {
      setError('You do not have permission to deny requests');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Deny Request',
      message: `Are you sure you want to deny ${request?.user?.username || 'this user'}'s request for ${getItemName(request) || 'this item'}?`,
      action: async () => {
        try {
          setLoading(true);
          const guildId = localStorage.getItem('guildId');
          if (!guildId) {
            console.error('No guild ID found');
            return;
          }
          
          console.log('Denying request:', request.id);
          
          await axiosInstance.put(`/api/waitlist/${request.id}`, { 
            status: 'Denied', 
            guildId 
          });
          
          console.log('Request denied successfully');
          
          await loadRequests();
          
          if (refreshData) {
            refreshData();
          }
        } catch (error) {
          console.error('Failed to deny request:', error);
          setError('Failed to deny request. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDelete = async (request) => {
    // Check permission
    if (!hasApprovalPermission()) {
      setError('You do not have permission to delete requests');
      return;
    }

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
          await axiosInstance.delete(`/api/waitlist/${request.id}?guildId=${guildId}`);
          
          // Refresh data in parent component
          if (refreshData) refreshData();
          
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
    return storageItem?.Item || storageItem?.item;
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

  // Get the item's timer duration
  const getItemTimerDuration = (request) => {
    const storageItem = getStorageItem(request);
    return storageItem?.timer_duration || 1440; // Default to 24 hours
  };

  // Get the item's creation time
  const getItemCreationTime = (request) => {
    const storageItem = getStorageItem(request);
    return storageItem?.createdAt || storageItem?.created_at;
  };

  // Group requests by item for better display
  const requestsByItem = {};
  requests.forEach(request => {
    const storageItemId = request.storage_item_id;
    if (!storageItemId) return;
    
    if (!requestsByItem[storageItemId]) {
      requestsByItem[storageItemId] = {
        item: getStorageItem(request),
        requests: []
      };
    }
    
    requestsByItem[storageItemId].requests.push(request);
  });

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#90caf9', mb: 0 }}>
            Item Requests
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadRequests}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CasinoIcon />}
              onClick={triggerRollCheck}
              disabled={triggeringRolls}
            >
              {triggeringRolls ? 'Processing...' : 'Trigger Roll Check'}
            </Button>
          </Box>
        </Box>
        
        {Object.keys(requestsByItem).length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No item requests found
            </Typography>
          </Box>
        ) : (
          Object.entries(requestsByItem).map(([itemId, { item, requests }]) => (
            <Paper 
              key={itemId} 
              sx={{ 
                mb: 4, 
                overflow: 'hidden',
                bgcolor: 'rgba(25, 25, 25, 0.9)'
              }}
            >
              {/* Item Header */}
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                bgcolor: 'rgba(30, 30, 30, 0.6)'
              }}>
                {/* Item Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={getItem(item)?.icon}
                    sx={{ width: 50, height: 50, border: '2px solid #90caf9' }}
                  >
                    {getItem(item)?.name?.[0] || '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {getItem(item)?.name || 'Unknown Item'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {getItem(item)?.type || 'Unknown Type'}
                      </Typography>
                      {item.trait && (
                        <Chip 
                          label={item.trait}
                          size="small"
                          sx={{ 
                            background: 'rgba(144, 202, 249, 0.2)',
                            color: '#90caf9',
                            height: 20,
                            '& .MuiChip-label': {
                              px: 1,
                              fontSize: '0.6rem'
                            }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
                
                {/* Roll Timer */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  bgcolor: 'rgba(0, 0, 0, 0.2)',
                  p: 1,
                  borderRadius: 1
                }}>
                  <TimerIcon sx={{ color: '#ff9800' }} />
                  <Typography variant="body1" sx={{ color: '#ff9800', fontWeight: 'medium' }}>
                    {formatRemainingTime(item.createdAt || item.created_at, item.timer_duration)}
                  </Typography>
                </Box>
              </Box>
              
              {/* Requests Table */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>Player</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>Roll</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests
                      // Sort by: 1. Roll status (winners first), 2. Priority (NEED_ITEM > NEED_TRAIT > GREED), 3. Roll value (highest first)
                      .sort((a, b) => {
                        // First sort by won_roll (winners first)
                        if (a.won_roll !== b.won_roll) {
                          return a.won_roll ? -1 : 1;
                        }
                        
                        // Then by need/greed priority
                        const priorityOrder = { 'NEED_ITEM': 0, 'NEED_TRAIT': 1, 'GREED': 2 };
                        const priorityDiff = priorityOrder[a.need_or_greed] - priorityOrder[b.need_or_greed];
                        if (priorityDiff !== 0) return priorityDiff;
                        
                        // Finally by roll value (higher first)
                        return (b.roll_value || 0) - (a.roll_value || 0);
                      })
                      .map((request) => (
                        <TableRow 
                          key={request.id}
                          sx={{ 
                            bgcolor: request.won_roll ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
                            '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.05)' },
                            borderLeft: request.won_roll ? '4px solid #ffd700' : 'none'
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar 
                                src={request.user?.avatar_url}
                                sx={{ 
                                  width: 35, 
                                  height: 35,
                                  border: request.won_roll ? '2px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                              >
                                {request.user?.username?.[0] || '?'}
                              </Avatar>
                              <Typography sx={{ color: request.won_roll ? '#ffd700' : 'white', fontWeight: request.won_roll ? 'bold' : 'normal' }}>
                                {request.user?.username || 'Unknown User'}
                                {request.won_roll && (
                                  <Typography 
                                    component="span" 
                                    sx={{ 
                                      ml: 1, 
                                      color: '#ffd700', 
                                      fontWeight: 'bold',
                                      fontSize: '0.7rem',
                                      bgcolor: 'rgba(255, 215, 0, 0.2)',
                                      px: 1,
                                      py: 0.2,
                                      borderRadius: 1,
                                      display: 'inline-block',
                                      verticalAlign: 'middle'
                                    }}
                                  >
                                    WINNER
                                  </Typography>
                                )}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {hasApprovalPermission() && request.status === 'Pending' ? (
                              <RollTypeEditor
                                userId={request.user_id || request.user?.id}
                                guildId={localStorage.getItem('guildId')}
                                currentRollType={request.need_or_greed}
                                itemId={getStorageItem(request)?.id}
                                requestId={request.id}
                                onRollTypeChanged={(newRollType, data) => {
                                  // Update local state
                                  const updatedRequests = requests.map(req => {
                                    if (req.id === request.id) {
                                      return { ...req, need_or_greed: newRollType };
                                    }
                                    return req;
                                  });
                                  setRequests(updatedRequests);
                                  
                                  // Show success notification
                                  setNotification({
                                    open: true,
                                    message: `Roll type updated to ${formatNeedOrGreed(newRollType)}`,
                                    severity: 'success'
                                  });
                                }}
                              />
                            ) : (
                              <Chip 
                                label={formatNeedOrGreed(request.need_or_greed)}
                                size="small"
                                sx={{ 
                                  bgcolor: getNeedOrGreedBgColor(request.need_or_greed),
                                  color: getNeedOrGreedColor(request.need_or_greed),
                                  fontWeight: 'medium'
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {request.roll_value ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {request.won_roll ? (
                                  <Tooltip title="Winner!">
                                    <Badge 
                                      badgeContent={<EmojiEventsIcon sx={{ fontSize: 16, color: '#ffd700' }} />}
                                      sx={{ 
                                        '& .MuiBadge-badge': { 
                                          bgcolor: 'transparent', 
                                          right: -2, 
                                          top: -2 
                                        }
                                      }}
                                    >
                                      <Chip
                                        icon={<CasinoIcon />}
                                        label={request.roll_value}
                                        sx={{
                                          bgcolor: 'rgba(255, 215, 0, 0.2)',
                                          color: '#ffd700',
                                          fontWeight: 'bold',
                                          border: '1px solid #ffd700'
                                        }}
                                      />
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Chip
                                    icon={<CasinoIcon />}
                                    label={request.roll_value}
                                    sx={{
                                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                                      color: 'white'
                                    }}
                                  />
                                )}
                              </Box>
                            ) : (
                              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                                Waiting for roll
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={request.status || 'Pending'}
                              sx={{ 
                                bgcolor: request.status === 'Approved' ? 'rgba(76, 175, 80, 0.2)' : 
                                        request.status === 'Denied' ? 'rgba(244, 67, 54, 0.2)' : 
                                        request.status === 'Denied - Lost Roll' ? 'rgba(156, 39, 176, 0.2)' :
                                        request.status === 'Denied - Out of Stock' ? 'rgba(121, 85, 72, 0.2)' :
                                        request.status === 'Expired' ? 'rgba(158, 158, 158, 0.2)' :
                                        'rgba(255, 183, 77, 0.2)',
                                color: request.status === 'Approved' ? '#4caf50' : 
                                       request.status === 'Denied' ? '#f44336' : 
                                       request.status === 'Denied - Lost Roll' ? '#9c27b0' :
                                       request.status === 'Denied - Out of Stock' ? '#795548' :
                                       request.status === 'Expired' ? '#9e9e9e' :
                                       '#ffb74d',
                                fontWeight: 'medium'
                              }}
                            />
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
                                      size="small"
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
                                      size="small"
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
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))
        )}
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
              // Execute the action function and then close the dialog
              if (confirmDialog.action) {
                console.log('Executing confirm action...');
                confirmDialog.action();
              }
              setConfirmDialog({ ...confirmDialog, open: false });
            }}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({...notification, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setNotification({...notification, open: false})} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WaitListTab;