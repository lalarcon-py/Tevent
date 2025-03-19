// src/components/LootManagement/RollHistoryTab.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Avatar, Chip, Divider,
  CircularProgress, TableContainer, Table, TableBody,
  TableCell, TableHead, TableRow, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axiosInstance from '../../config/axios';

const RollHistoryTab = ({ refreshData }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(null);

  useEffect(() => {
    fetchRollHistory();
  }, [refreshData]);

  const fetchRollHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      const response = await axiosInstance.get(`/api/guild-storage/roll-history?guildId=${guildId}`);
      
      // Handle different response formats gracefully
      if (Array.isArray(response.data)) {
        setHistory(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object and not an array, check if it's empty
        if (Object.keys(response.data).length === 0) {
          setHistory([]);
        } else {
          // Could be a single item not wrapped in array
          setHistory([response.data]);
        }
      } else {
        // Fallback to empty array
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching roll history:', error);
      setError('Failed to load roll history');
      setHistory([]); // Always set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (roll) => {
    setSelectedRoll(roll);
    setDetailsOpen(true);
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
        <Button variant="contained" onClick={fetchRollHistory} sx={{ mt: 2 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0', mb: 3 }}>
        Roll History
      </Typography>

      {history.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
            No roll history found. Loot rolls will appear here once items have been distributed.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(30, 30, 30, 0.6)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Winner</TableCell>
                <TableCell>Roll</TableCell>
                <TableCell>Need/Greed</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((roll) => (
                <TableRow key={roll.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={roll.item_icon}
                        sx={{ width: 40, height: 40 }}
                      >
                        {!roll.item_icon && roll.item_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{roll.item_name}</Typography>
                        {roll.item_trait && (
                          <Chip
                            label={roll.item_trait}
                            size="small"
                            sx={{ 
                              background: 'rgba(144, 202, 249, 0.2)',
                              color: '#90caf9',
                              mt: 0.5
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={roll.winner?.avatar_url}
                        sx={{ 
                          width: 35, 
                          height: 35,
                          border: '2px solid #ffd700'
                        }}
                      >
                        {roll.winner_name?.[0] || '?'}
                      </Avatar>
                      <Typography sx={{ color: '#ffd700' }}>
                        {roll.winner?.username || roll.winner_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<CasinoIcon />}
                      label={roll.winner_roll}
                      sx={{
                        bgcolor: 'rgba(255, 215, 0, 0.2)',
                        color: '#ffd700',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={roll.winner_need_type === 'NEED_ITEM' ? 'Need Item' :
                             roll.winner_need_type === 'NEED_TRAIT' ? 'Need Trait' : 'Greed'}
                      sx={{ 
                        bgcolor: roll.winner_need_type === 'NEED_ITEM' ? 'rgba(76, 175, 80, 0.2)' :
                                roll.winner_need_type === 'NEED_TRAIT' ? 'rgba(33, 150, 243, 0.2)' :
                                'rgba(255, 152, 0, 0.2)',
                        color: roll.winner_need_type === 'NEED_ITEM' ? '#4caf50' :
                               roll.winner_need_type === 'NEED_TRAIT' ? '#2196f3' :
                               '#ff9800'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(roll.roll_time).toLocaleDateString()} {new Date(roll.roll_time).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton onClick={() => handleShowDetails(roll)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Roll Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRoll && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              bgcolor: 'rgba(156, 39, 176, 0.1)' 
            }}>
              <CasinoIcon sx={{ color: '#9c27b0' }} />
              Roll Results for {selectedRoll.item_name}
            </DialogTitle>
            <DialogContent>
              {/* Winner Section */}
              <Box sx={{ 
                p: 3, 
                mt: 2, 
                mb: 3, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: 'rgba(255, 215, 0, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}>
                <Box sx={{ position: 'relative' }}>
                  <EmojiEventsIcon sx={{ 
                    color: '#ffd700', 
                    fontSize: 60, 
                    position: 'absolute',
                    top: -40,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }} />
                </Box>
                
                <Typography variant="h5" sx={{ color: '#ffd700', mb: 2, mt: 3, fontWeight: 'bold' }}>
                  Winner
                </Typography>
                
                <Avatar 
                  src={selectedRoll.winner?.avatar_url}
                  sx={{ 
                    width: 80, 
                    height: 80,
                    border: '3px solid #ffd700',
                    mb: 2
                  }}
                >
                  {selectedRoll.winner_name?.[0] || '?'}
                </Avatar>
                
                <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                  {selectedRoll.winner?.username || selectedRoll.winner_name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Chip
                    icon={<CasinoIcon />}
                    label={`Roll: ${selectedRoll.winner_roll}`}
                    sx={{
                      bgcolor: 'rgba(255, 215, 0, 0.2)',
                      color: '#ffd700',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      py: 1
                    }}
                  />
                  
                  <Chip 
                    label={selectedRoll.winner_need_type === 'NEED_ITEM' ? 'Need Item' :
                           selectedRoll.winner_need_type === 'NEED_TRAIT' ? 'Need Trait' : 'Greed'}
                    sx={{ 
                      bgcolor: selectedRoll.winner_need_type === 'NEED_ITEM' ? 'rgba(76, 175, 80, 0.2)' :
                              selectedRoll.winner_need_type === 'NEED_TRAIT' ? 'rgba(33, 150, 243, 0.2)' :
                              'rgba(255, 152, 0, 0.2)',
                      color: selectedRoll.winner_need_type === 'NEED_ITEM' ? '#4caf50' :
                             selectedRoll.winner_need_type === 'NEED_TRAIT' ? '#2196f3' :
                             '#ff9800',
                      fontWeight: 'medium'
                    }}
                  />
                </Box>
              </Box>
              
              {/* All Rolls Section */}
              <Typography variant="h6" sx={{ mb: 2, color: '#9c27b0' }}>
                All Roll Results
              </Typography>
              
              {selectedRoll.roll_results && selectedRoll.roll_results.length > 0 ? (
                <TableContainer component={Paper} sx={{ 
                  bgcolor: 'rgba(30, 30, 30, 0.6)',
                  backdropFilter: 'blur(12px)'
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Player</TableCell>
                        <TableCell>Roll</TableCell>
                        <TableCell>Need/Greed</TableCell>
                        <TableCell>Result</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedRoll.roll_results.map((roll, index) => (
                        <TableRow key={index} sx={{
                          bgcolor: roll.winner || roll.user_id === selectedRoll.winner_id ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.05)' }
                        }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar 
                                src={roll.avatar_url}
                                sx={{ 
                                  width: 35, 
                                  height: 35,
                                  border: roll.winner || roll.user_id === selectedRoll.winner_id ? '2px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.2)'
                                }}
                              >
                                {roll.username?.[0] || '?'}
                              </Avatar>
                              <Typography sx={{ color: roll.winner || roll.user_id === selectedRoll.winner_id ? '#ffd700' : 'white' }}>
                                {roll.username}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<CasinoIcon />}
                              label={roll.roll_value}
                              sx={{
                                bgcolor: roll.winner || roll.user_id === selectedRoll.winner_id ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                color: roll.winner || roll.user_id === selectedRoll.winner_id ? '#ffd700' : 'white',
                                fontWeight: roll.winner || roll.user_id === selectedRoll.winner_id ? 'bold' : 'normal'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={roll.need_or_greed === 'NEED_ITEM' ? 'Need Item' :
                                    roll.need_or_greed === 'NEED_TRAIT' ? 'Need Trait' : 'Greed'}
                              size="small"
                              sx={{ 
                                bgcolor: roll.need_or_greed === 'NEED_ITEM' ? 'rgba(76, 175, 80, 0.2)' :
                                        roll.need_or_greed === 'NEED_TRAIT' ? 'rgba(33, 150, 243, 0.2)' :
                                        'rgba(255, 152, 0, 0.2)',
                                color: roll.need_or_greed === 'NEED_ITEM' ? '#4caf50' :
                                      roll.need_or_greed === 'NEED_TRAIT' ? '#2196f3' :
                                      '#ff9800'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {roll.winner || roll.user_id === selectedRoll.winner_id ? (
                              <Chip 
                                label="Winner" 
                                sx={{ bgcolor: 'rgba(255, 215, 0, 0.2)', color: '#ffd700' }}
                                icon={<EmojiEventsIcon sx={{ color: '#ffd700' }} />}
                              />
                            ) : (
                              <Chip 
                                label="Lost Roll" 
                                sx={{ bgcolor: 'rgba(158, 158, 158, 0.2)', color: '#9e9e9e' }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Detailed roll results are not available for this item.
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default RollHistoryTab;