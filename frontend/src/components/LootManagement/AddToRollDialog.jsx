// src/components/LootManagement/AddToRollDialog.jsx
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
  Alert,
  RadioGroup,
  FormControlLabel,
  Chip,
  Radio
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import axiosInstance from '../../config/axios';

const AddToRollDialog = ({ 
  open, 
  onClose, 
  rollHistoryId, 
  guildId, 
  itemName, 
  itemIcon,
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guildMembers, setGuildMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [rollType, setRollType] = useState('NEED_ITEM');
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
      setRollType('NEED_ITEM');
      setNote('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedMember) {
        setError('Please select a member to add to the roll');
        setLoading(false);
        return;
      }

      console.log('Sending add to roll request:', {
        guildId,
        rollHistoryId,
        userId: selectedMember,
        rollType,
        note: note ? 'provided' : 'not provided'
      });

      // Make API call to add user to roll
      try {
        const response = await axiosInstance.post(`/api/guilds/${guildId}/rolls/add-to-roll/${rollHistoryId}`, {
          userId: selectedMember,
          rollType: rollType,
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
          setError(response.data.error || 'Failed to add user to roll');
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
        bgcolor: 'rgba(76, 175, 80, 0.1)', 
        borderBottom: '1px solid rgba(76, 175, 80, 0.2)',
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddCircleOutlineIcon sx={{ color: '#4caf50' }} />
          <Typography variant="h6">
            Add User to Roll
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {/* Item info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Item:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              src={itemIcon}
              sx={{ width: 40, height: 40 }}
            >
              {!itemIcon && itemName?.[0]}
            </Avatar>
            <Typography variant="body1" fontWeight="medium">
              {itemName}
            </Typography>
          </Box>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <InfoIcon sx={{ mt: 0.5 }} />
            <Box>
              <Typography variant="body2">
                This will add a user to the roll who forgot to sign up before the roll expired.
                The user will be assigned a random roll value and can win if their roll is high enough.
              </Typography>
            </Box>
          </Box>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Member selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="member-select-label">Select Member</InputLabel>
          <Select
            labelId="member-select-label"
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            label="Select Member"
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
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      src={member.avatarUrl} 
                      sx={{ width: 30, height: 30 }}
                    >
                      {member.username[0]}
                    </Avatar>
                    {member.username}
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Display selected member */}
        {selectedMember && (
          <Box sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'rgba(76, 175, 80, 0.1)', 
            borderRadius: 1,
            border: '1px solid rgba(76, 175, 80, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar 
              src={getMemberDetails(selectedMember)?.avatarUrl} 
              sx={{ 
                width: 40, 
                height: 40,
                border: '2px solid #4caf50'
              }}
            >
              {getMemberDetails(selectedMember)?.username[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">{getMemberDetails(selectedMember)?.username}</Typography>
              <Typography variant="body2" color="text.secondary">Will be added to the roll</Typography>
            </Box>
          </Box>
        )}

        {/* Roll Type Selection */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Roll Type:
          </Typography>
          <RadioGroup
            value={rollType}
            onChange={(e) => setRollType(e.target.value)}
            row
          >
            <FormControlLabel 
              value="NEED_ITEM" 
              control={<Radio />} 
              label={
                <Chip 
                  label="Need Item"
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(76, 175, 80, 0.2)',
                    color: '#4caf50'
                  }}
                />
              } 
            />
            <FormControlLabel 
              value="NEED_TRAIT" 
              control={<Radio />} 
              label={
                <Chip 
                  label="Need Trait"
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(33, 150, 243, 0.2)',
                    color: '#2196f3'
                  }}
                />
              } 
            />
            <FormControlLabel 
              value="GREED" 
              control={<Radio />} 
              label={
                <Chip 
                  label="Greed"
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255, 152, 0, 0.2)',
                    color: '#ff9800'
                  }}
                />
              } 
            />
          </RadioGroup>
        </FormControl>

        {/* Reason note */}
        <TextField 
          label="Reason (Optional)"
          fullWidth
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., 'Member forgot to sign up' or 'Technical issues prevented signup'"
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
          color="success"
          onClick={handleSubmit}
          disabled={loading || !selectedMember}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutlineIcon />}
        >
          {loading ? 'Processing...' : 'Add to Roll'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddToRollDialog;