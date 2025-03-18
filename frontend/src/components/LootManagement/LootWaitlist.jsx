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
  Chip,
  Tooltip,
  Badge
} from '@mui/material';
import { useState, useEffect } from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Trophy icon
import CasinoIcon from '@mui/icons-material/Casino'; // Dice icon
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';

const LootWaitlist = ({ dkpEnabled, refreshData }) => {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());

  // Update current time every minute to refresh timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests();
    }
  }, [isAuthenticated]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
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
      console.error('Error loading requests:', error);
      setError('Failed to load your waitlist items. Please try again later.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Make sure component refreshes when the refreshTrigger changes
  useEffect(() => {
    if (isAuthenticated && refreshData) {
      console.log('Refreshing waitlist due to refreshData change');
      loadRequests();
    }
  }, [refreshData, isAuthenticated]);

  // Format remaining time
  const formatRemainingTime = (expirationTime) => {
    if (!expirationTime) return "No expiration";
    
    const expiration = new Date(expirationTime);
    const diffMs = expiration - now;
    
    if (diffMs <= 0) return "Expired";
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Get color for timer based on remaining time
  const getTimerColor = (expirationTime) => {
    if (!expirationTime) return "text.secondary";
    
    const expiration = new Date(expirationTime);
    const diffMs = expiration - now;
    
    if (diffMs <= 0) return "#f44336"; // Expired - red
    if (diffMs < 3600000) return "#ff9800"; // Less than 1 hour - orange
    return "#4caf50"; // More than 1 hour - green
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
              <TableCell sx={{ color: '#90caf9' }}>Need/Greed</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Expires In</TableCell>
              <TableCell sx={{ color: '#90caf9' }}>Roll</TableCell>
              {/* Only show DKP Priority column if DKP is enabled */}
              {dkpEnabled && (
                <TableCell sx={{ color: '#90caf9' }}>DKP Priority</TableCell>
              )}
              <TableCell sx={{ color: '#90caf9' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length > 0 ? (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={(request.storageItem && request.storageItem.Item) ? request.storageItem.Item.icon : null}
                        sx={{ width: 40, height: 40 }}
                      >
                        {!request.storageItem?.Item?.icon && (request.storageItem?.Item?.name?.[0] || '?')}
                      </Avatar>
                      <Box>
                        <Typography sx={{ color: 'white', fontWeight: 'medium' }}>
                          {(request.storageItem && request.storageItem.Item) ? request.storageItem.Item.name : 'Unknown Item'}
                        </Typography>
                        {request.storageItem?.trait && (
                          <Chip
                            label={request.storageItem.trait}
                            size="small"
                            sx={{ 
                              mt: 0.5,
                              height: 20,
                              background: 'rgba(144, 202, 249, 0.2)',
                              color: '#90caf9',
                              '& .MuiChip-label': {
                                px: 1,
                                fontSize: '0.6rem'
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {request.storageItem?.Item?.type || 'Unknown Type'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatNeedOrGreed(request.need_or_greed)}
                      sx={{ 
                        bgcolor: getNeedOrGreedBgColor(request.need_or_greed),
                        color: getNeedOrGreedColor(request.need_or_greed),
                        fontWeight: 'medium'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={request.expiration_time ? new Date(request.expiration_time).toLocaleString() : 'No expiration'}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon sx={{ color: getTimerColor(request.expiration_time) }} />
                        <Typography sx={{ color: getTimerColor(request.expiration_time) }}>
                          {formatRemainingTime(request.expiration_time)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {request.roll_value ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {request.won_roll ? (
                          <Tooltip title="You won this roll!">
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
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Waiting...
                      </Typography>
                    )}
                  </TableCell>
                  {/* Only show DKP Priority cell if DKP is enabled */}
                  {dkpEnabled && (
                    <TableCell sx={{ color: 'white' }}>{request.priority || 0} DKP</TableCell>
                  )}
                  <TableCell>
                    <Chip 
                      label={request.status || 'Pending'}
                      sx={{ 
                        bgcolor: request.status === 'Approved' ? 'rgba(76, 175, 80, 0.2)' : 
                                request.status === 'Denied' ? 'rgba(244, 67, 54, 0.2)' : 
                                request.status === 'Denied - Lost Roll' ? 'rgba(156, 39, 176, 0.2)' :
                                request.status === 'Expired' ? 'rgba(158, 158, 158, 0.2)' :
                                'rgba(255, 183, 77, 0.2)',
                        color: request.status === 'Approved' ? '#4caf50' : 
                               request.status === 'Denied' ? '#f44336' : 
                               request.status === 'Denied - Lost Roll' ? '#9c27b0' :
                               request.status === 'Expired' ? '#9e9e9e' :
                               '#ffb74d',
                        fontWeight: 'medium'
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={dkpEnabled ? 7 : 6} sx={{ color: 'white', textAlign: 'center', p: 3 }}>
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