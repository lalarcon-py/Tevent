// src/components/LootManagement/ManualWinnerSelector.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CloseIcon from '@mui/icons-material/Close';
import axiosInstance from '../../config/axios';

const ManualWinnerSelector = ({ 
  guildId, 
  itemId, 
  requestId, 
  onSuccess,
  itemName,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [note, setNote] = useState('');

  // Load guild members when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchGuildMembers();
    }
  }, [isOpen]);

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
        setMembers(sortedMembers);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching guild members:', error);
      setError('Failed to load guild members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setSelectedMember('');
    setNote('');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        userId: selectedMember,
        note: note
      };
      
      // Add either itemId or requestId to the payload
      if (itemId) payload.itemId = itemId;
      if (requestId) payload.requestId = requestId;

      const response = await axiosInstance.post(`/api/guilds/${guildId}/set-winner`, payload);
      
      if (response.data.success) {
        if (onSuccess) {
          onSuccess(response.data);
        }
        handleClose();
      } else {
        setError(response.data.error || 'Failed to set winner');
      }
    } catch (error) {
      console.error('Error setting winner:', error);
      setError(error.response?.data?.error || 'Failed to set winner');
    } finally {
      setLoading(false);
    }
  };

  // Find member details by ID
  const getMemberDetails = (id) => {
    return members.find(member => member.id === id) || null;
  };

  return (
    <Box>
      <Button
        startIcon={<PersonAddIcon />}
        variant="contained"
        size="small"
        color="secondary"
        onClick={handleOpen}
        disabled={disabled}
        sx={{
          textTransform: 'none',
          fontWeight: 'medium',
          bgcolor: 'rgba(156, 39, 176, 0.9)',
          '&:hover': {
            bgcolor: 'rgba(156, 39, 176, 1)',
          }
        }}
      >
        Set Winner
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
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
            <EmojiEventsIcon sx={{ color: '#ffd700' }} />
            <Typography variant="h6">
              Manually Assign Winner
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {itemName && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Item:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {itemName}
              </Typography>
            </Box>
          )}
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Manually assigning a winner will create a roll history entry and update item quantities.
            The selected player will get a roll value of 100, ensuring they win over other players.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="member-select-label">Select Winner</InputLabel>
            <Select
              labelId="member-select-label"
              id="member-select"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              label="Select Winner"
              disabled={loadingMembers || loading}
            >
              {loadingMembers ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading members...
                </MenuItem>
              ) : members.length === 0 ? (
                <MenuItem disabled>No members found</MenuItem>
              ) : (
                members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
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

          {selectedMember && (
            <Box sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: 'rgba(255, 215, 0, 0.1)', 
              borderRadius: 1,
              border: '1px solid rgba(255, 215, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <Avatar 
                src={getMemberDetails(selectedMember)?.avatarUrl} 
                sx={{ 
                  width: 48, 
                  height: 48,
                  border: '2px solid #ffd700'
                }}
              >
                {getMemberDetails(selectedMember)?.username[0]}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">{getMemberDetails(selectedMember)?.username}</Typography>
                <Typography variant="body2" color="text.secondary">Will be assigned as winner</Typography>
              </Box>
            </Box>
          )}

          <TextField 
            label="Reason Note (Optional)"
            fullWidth
            multiline
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., 'Guild Master decision' or 'Makeup for missed roll'"
            disabled={loading}
            helperText="This note will be visible in the roll history"
          />
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            color="secondary"
            onClick={handleSubmit}
            disabled={loading || !selectedMember}
            startIcon={loading ? <CircularProgress size={20} /> : <EmojiEventsIcon />}
          >
            {loading ? 'Processing...' : 'Assign Winner'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManualWinnerSelector;