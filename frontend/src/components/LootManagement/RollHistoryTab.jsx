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
import WarningIcon from '@mui/icons-material/Warning';
import RepeatIcon from '@mui/icons-material/Repeat';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import ChangeWinnerDialog from './ChangeWinnerDialog';
import AddToRollDialog from './AddToRollDialog';

const RollHistoryTab = ({ refreshData }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const { user } = useAuth();
  const { simulatedRole } = useSimulatedRole();
  
  // State for change winner and add to roll dialogs
  const [changeWinnerDialogOpen, setChangeWinnerDialogOpen] = useState(false);
  const [rollToChangeWinner, setRollToChangeWinner] = useState(null);
  const [addToRollDialogOpen, setAddToRollDialogOpen] = useState(false);
  const [rollToAddUser, setRollToAddUser] = useState(null);

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

  const handleOpenChangeWinnerDialog = (roll) => {
    setRollToChangeWinner(roll);
    setChangeWinnerDialogOpen(true);
  };
  
  const handleOpenAddToRollDialog = (roll) => {
    setRollToAddUser(roll);
    setAddToRollDialogOpen(true);
  };
  
  // Check if user is a Guild Master
  const isGuildMaster = () => {
    if (!user) return false;
    return user.role === 'Guild Master' || simulatedRole === 'Guild Master';
  };
  
  // Check if user has admin privileges (Guild Master, Advisor, or Guardian)
  const hasAdminPrivileges = () => {
    if (!user) return false;
    const userRole = simulatedRole || user.role;
    return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(userRole);
  };
  
  // Handle successful winner change
  const handleWinnerChanged = (result) => {
    // Refresh the roll history data
    fetchRollHistory();
    
    // If the currently selected roll is the one that was changed, update it
    if (selectedRoll && selectedRoll.id === rollToChangeWinner.id) {
      setSelectedRoll(prev => ({
        ...prev,
        winner_id: result.newWinner.id,
        winner_name: result.newWinner.username,
        reprocessed: true,
        reprocessed_note: `Winner changed from ${result.originalWinner.name} to ${result.newWinner.username}`
      }));
    }
  };
  
  // Handle successful user added to roll
  const handleUserAddedToRoll = (result) => {
    // Refresh the roll history data
    fetchRollHistory();
    
    // If the currently selected roll is the one that was modified, update it
    if (selectedRoll && selectedRoll.id === rollToAddUser.id) {
      // Get updated roll data
      fetchRollDetails(selectedRoll.id);
    }
  };
  
  // Fetch detailed roll information for a specific roll
  const fetchRollDetails = async (rollId) => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId || !rollId) return;
      
      const response = await axiosInstance.get(`/api/guild-storage/roll-history/${rollId}?guildId=${guildId}`);
      if (response.data) {
        setSelectedRoll(response.data);
      }
    } catch (error) {
      console.error('Error fetching roll details:', error);
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
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((roll) => (
                <TableRow key={roll.id} hover
                sx={{
                  bgcolor: roll.is_repeated_win ? 'rgba(244, 67, 54, 0.05)' : 'transparent'
                }}
              >
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
                          border: roll.is_repeated_win ? '2px solid #f44336' : '2px solid #ffd700'
                        }}
                      >
                        {roll.winner_name?.[0] || '?'}
                      </Avatar>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: roll.is_repeated_win ? '#f44336' : '#ffd700' }}>
                          {roll.winner?.username || roll.winner_name}
                        </Typography>
                        {roll.is_repeated_win && (
                          <Tooltip title={`Repeated Win! Previously won this item on ${new Date(roll.previous_win_date).toLocaleDateString()}`} arrow>
                            <WarningIcon sx={{ color: '#f44336', fontSize: 20 }} />
                          </Tooltip>
                        )}
                      </Box>
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
                    {roll.reprocessed && (
                      <Tooltip title={roll.reprocessed_note ? roll.reprocessed_note : "This roll was reprocessed with updated roll logic"}>
                        <Chip
                          label={roll.reprocessed_note && roll.reprocessed_note.includes("Manually") ? "Manual Assignment" : "Reprocessed"}
                          size="small"
                          sx={{
                            bgcolor: roll.reprocessed_note && roll.reprocessed_note.includes("Manually") ? 'rgba(156, 39, 176, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                            color: roll.reprocessed_note && roll.reprocessed_note.includes("Manually") ? '#9c27b0' : '#2196f3',
                            border: roll.reprocessed_note && roll.reprocessed_note.includes("Manually") ? '1px solid rgba(156, 39, 176, 0.3)' : '1px solid rgba(33, 150, 243, 0.3)'
                          }}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton onClick={() => handleShowDetails(roll)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Change Winner button - only for Guild Masters */}
                      {isGuildMaster() && (
                        <Tooltip title="Change Winner">
                          <IconButton 
                            onClick={() => handleOpenChangeWinnerDialog(roll)}
                            sx={{ color: '#9c27b0' }}
                          >
                            <RepeatIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {/* Add to Roll button - for Guild Masters, Advisors, and Guardians */}
                      {hasAdminPrivileges() && (
                        <Tooltip title="Add User to Roll">
                          <IconButton 
                            onClick={() => handleOpenAddToRollDialog(roll)}
                            sx={{ color: '#4caf50' }}
                          >
                            <AddCircleOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
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
                
                <Typography variant="h5" sx={{ color: selectedRoll.is_repeated_win ? '#f44336' : '#ffd700', mb: 2, mt: 3, fontWeight: 'bold' }}>
                  Winner {selectedRoll.is_repeated_win && '(Repeat Win)'}
                </Typography>
                
                <Avatar 
                  src={selectedRoll.winner?.avatar_url}
                  sx={{ 
                    width: 80, 
                    height: 80,
                    border: selectedRoll.is_repeated_win ? '3px solid #f44336' : '3px solid #ffd700',
                    mb: 2
                  }}
                >
                  {selectedRoll.winner_name?.[0] || '?'}
                </Avatar>
                
                <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                  {selectedRoll.winner?.username || selectedRoll.winner_name}
                </Typography>
                
                {selectedRoll.is_repeated_win && (
                  <Box sx={{ 
                    p: 1.5, 
                    bgcolor: 'rgba(244, 67, 54, 0.1)', 
                    borderRadius: 1, 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <WarningIcon sx={{ color: '#f44336' }} />
                    <Typography sx={{ color: '#f44336' }}>
                      This player previously won this item on {new Date(selectedRoll.previous_win_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
                
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
                  
                  <Box sx={{ display: 'flex', ml: 'auto' }}>
                    {/* Add to Roll button in the details dialog */}
                    {hasAdminPrivileges() && (
                      <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={() => {
                          setDetailsOpen(false); // Close details dialog
                          handleOpenAddToRollDialog(selectedRoll); // Open add to roll dialog
                        }}
                        sx={{ mr: 1 }}
                      >
                        Add User
                      </Button>
                    )}
                    
                    {/* Change Winner button in the details dialog */}
                    {isGuildMaster() && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        startIcon={<RepeatIcon />}
                        onClick={() => {
                          setDetailsOpen(false); // Close details dialog
                          handleOpenChangeWinnerDialog(selectedRoll); // Open change winner dialog
                        }}
                      >
                        Change Winner
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
              
              {/* Reprocessed or Manual Roll Notice */}
              {selectedRoll.reprocessed && (
                <Box sx={{ 
                  p: 2, 
                  mb: 3, 
                  bgcolor: selectedRoll.reprocessed_note && selectedRoll.reprocessed_note.includes("Manually") ? 'rgba(156, 39, 176, 0.1)' : 'rgba(33, 150, 243, 0.1)', 
                  borderRadius: 1,
                  border: selectedRoll.reprocessed_note && selectedRoll.reprocessed_note.includes("Manually") ? '1px solid rgba(156, 39, 176, 0.3)' : '1px solid rgba(33, 150, 243, 0.3)' 
                }}>
                  <Typography variant="subtitle1" sx={{ 
                    color: selectedRoll.reprocessed_note && selectedRoll.reprocessed_note.includes("Manually") ? '#9c27b0' : '#2196f3', 
                    fontWeight: 'medium' 
                  }}>
                    {selectedRoll.reprocessed_note && selectedRoll.reprocessed_note.includes("Manually") ? 'Manual Winner Assignment' : 'Roll Logic Update Notice'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    {selectedRoll.reprocessed_note || 
                     'This roll has been reprocessed with updated priority rules: NEED_ITEM > NEED_TRAIT > GREED.'}
                  </Typography>
                </Box>
              )}
              
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

      {/* Change Winner Dialog */}
      {rollToChangeWinner && (
        <ChangeWinnerDialog
          open={changeWinnerDialogOpen}
          onClose={() => setChangeWinnerDialogOpen(false)}
          rollHistoryId={rollToChangeWinner.id}
          guildId={localStorage.getItem('guildId')}
          currentWinner={{
            id: rollToChangeWinner.winner_id,
            username: rollToChangeWinner.winner_name,
            avatarUrl: rollToChangeWinner.winner?.avatar_url
          }}
          itemName={rollToChangeWinner.item_name}
          onSuccess={handleWinnerChanged}
        />
      )}
      
      {/* Add User to Roll Dialog */}
      {rollToAddUser && (
        <AddToRollDialog
          open={addToRollDialogOpen}
          onClose={() => setAddToRollDialogOpen(false)}
          rollHistoryId={rollToAddUser.id}
          guildId={localStorage.getItem('guildId')}
          itemName={rollToAddUser.item_name}
          itemIcon={rollToAddUser.item_icon}
          onSuccess={handleUserAddedToRoll}
        />
      )}
    </Box>
  );
};

export default RollHistoryTab;