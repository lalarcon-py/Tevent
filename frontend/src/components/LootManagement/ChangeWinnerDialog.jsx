// src/components/LootManagement/ChangeWinnerDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
  Alert
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InfoIcon from '@mui/icons-material/Info';
import RepeatIcon from '@mui/icons-material/Repeat';
import axiosInstance from '../../config/axios';

const ChangeWinnerDialog = ({ 
  open, 
  onClose, 
  rollHistoryId, 
  guildId, 
  currentWinner, 
  itemName, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guildMembers, setGuildMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [note, setNote] = useState('');

  // Fetch guild members when dialog opens
  useEffect(() => {
    if (open && guildId) {
      fetchGuildMembers();
    }
  }, [open, guildId]);

  const fetchGuildMembers = async () => {
    try {
      setLoadingMembers(true);
      setError(null);

      const response = await axiosInstance.get(`/api/guilds/${guildId}/members`);
      
      if (Array.isArray(response.data)) {
        // Sort members by username
        const sortedMembers = response.data.sort((a, b) => 
          a.username.localeCompare(b.username)
        );
        setGuildMembers(sortedMembers);
      } else {
        setGuildMembers([]);
      }
    } catch (error) {
      console.error('Error fetching guild members:', error);
      setError('Failed to load guild members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedMember('');
      setNote('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedMember) {
        setError('Please select a new winner');
        setLoading(false);
        return;
      }

      // Don't allow selecting the current winner
      if (selectedMember === currentWinner.id) {
        setError('The selected member is already the winner');
        setLoading(false);
        return;
      }

      console.log('Sending change winner request:', {
        guildId,
        rollHistoryId,
        userId: selectedMember,
        note: note ? 'provided' : 'not provided'
      });

      // Use a try-catch block specifically for the API request
      try {
        const response = await axiosInstance.post(`/api/guilds/${guildId}/change-winner/${rollHistoryId}`, {
          userId: selectedMember,
          note: note
        });

        console.log('Received response:', response.data);

        if (response.data.success) {
          if (onSuccess) {
            onSuccess(response.data);
          }
          onClose();
        } else {
          console.error('API returned error:', response.data);
          setError(response.data.error || 'Failed to change winner');
        }
      } catch (apiError) {
        console.error('API request failed:', apiError);
        
        if (apiError.response) {
          // Server responded with an error status code
          console.error('Server response:', {
            status: apiError.response.status,
            statusText: apiError.response.statusText,
            data: apiError.response.data
          });
          
          // Get more specific error message if available
          const errorMsg = apiError.response.data?.error || 
                          apiError.response.data?.message || 
                          `Server error: ${apiError.response.status} ${apiError.response.statusText}`;
          
          setError(errorMsg);
        } else if (apiError.request) {
          // Request was made but no response received
          console.error('No response received:', apiError.request);
          setError('No response from server. Please try again later.');
        } else {
          // Error setting up the request
          console.error('Request setup error:', apiError.message);
          setError(`Request error: ${apiError.message}`);
        }
      }
    } catch (error) {
      // Handle any other errors that might occur
      console.error('Unexpected error during submission:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Find member details by ID
  const getMemberDetails = (id) => {
    return guildMembers.find(member => member.id === id) || null;
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e1e',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03))',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'rgba(156, 39, 176, 0.1)', 
        borderBottom: '1px solid rgba(156, 39, 176, 0.2)',
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RepeatIcon sx={{ color: '#9c27b0' }} />
          <Typography variant="h6">
            Change Winner
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {/* Item and current winner info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Item:
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {itemName}
          </Typography>
        </Box>
        
        {/* Current winner section */}
        {currentWinner && (
          <Box sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'rgba(255, 215, 0, 0.1)', 
            borderRadius: 1,
            border: '1px solid rgba(255, 215, 0, 0.2)'
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Winner:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                src={currentWinner.avatarUrl}
                sx={{ 
                  width: 40, 
                  height: 40,
                  border: '2px solid #ffd700'
                }}
              >
                {currentWinner.username?.[0]}
              </Avatar>
              <Typography variant="body1" sx={{ color: '#ffd700', fontWeight: 'medium' }}>
                {currentWinner.username}
              </Typography>
              <EmojiEventsIcon sx={{ color: '#ffd700' }} />
            </Box>
          </Box>
        )}
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <InfoIcon sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="body2">
                This will change the winner of this item in the roll history. 
                The change will be visible to all guild members. 
              </Typography>
            </Box>
          </Box>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* New winner selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="new-winner-select-label">Select New Winner</InputLabel>
          <Select
            labelId="new-winner-select-label"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            label="Select New Winner"
            disabled={loadingMembers || loading}
          >
            {loadingMembers ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Loading members...
              </MenuItem>
            ) : guildMembers.length === 0 ? (
              <MenuItem disabled>No members found</MenuItem>
            ) : (
              guildMembers.map((member) => (
                <MenuItem 
                  key={member.id} 
                  value={member.id}
                  disabled={currentWinner && member.id === currentWinner.id}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      src={member.avatarUrl} 
                      sx={{ width: 30, height: 30 }}
                    >
                      {member.username[0]}
                    </Avatar>
                    {member.username}
                    {currentWinner && member.id === currentWinner.id && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                        (Current Winner)
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Display selected new winner */}
        {selectedMember && (
          <Box sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'rgba(156, 39, 176, 0.1)', 
            borderRadius: 1,
            border: '1px solid rgba(156, 39, 176, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar 
              src={getMemberDetails(selectedMember)?.avatarUrl} 
              sx={{ 
                width: 40, 
                height: 40,
                border: '2px solid #9c27b0'
              }}
            >
              {getMemberDetails(selectedMember)?.username[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">{getMemberDetails(selectedMember)?.username}</Typography>
              <Typography variant="body2" color="text.secondary">Will be the new winner</Typography>
            </Box>
          </Box>
        )}

        {/* Reason note */}
        <TextField 
          label="Reason for Change (Optional)"
          fullWidth
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., 'Correcting a roll mistake' or 'Member requested'"
          disabled={loading}
          helperText="This note will be visible in the roll history"
        />
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Button 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          variant="contained"
          color="secondary"
          onClick={handleSubmit}
          disabled={loading || !selectedMember}
          startIcon={loading ? <CircularProgress size={20} /> : <RepeatIcon />}
        >
          {loading ? 'Processing...' : 'Change Winner'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeWinnerDialog;