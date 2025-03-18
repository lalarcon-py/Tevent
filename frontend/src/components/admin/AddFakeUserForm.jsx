// src/components/admin/AddFakeUserForm.jsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider, CircularProgress, Alert,
  IconButton, Tooltip, Chip  // Added Chip import here
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import axiosInstance from '../../config/axios';

const ROLE_OPTIONS = [
  'Guild Member',
  'Guild Guardian',
  'Guild Advisor',
  'Guild Master'
];

const AddFakeUserForm = ({ guildId, guildName, members, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    role: 'Guild Member',
    avatar_url: '',
    combat_power: 1000,
    status: 'Active'
  });
  // Add state for delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'combat_power' ? Number(value) : value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.post('/api/admin/fake-users', {
        ...formData,
        guildId
      });
      
      setLoading(false);
      setOpen(false);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      // Reset form
      setFormData({
        username: '',
        role: 'Guild Member',
        avatar_url: '',
        combat_power: 1000,
        status: 'Active'
      });
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Failed to create fake user');
    }
  };

  // Delete a fake user - fixed confirm usage
  const openDeleteConfirm = (userId) => {
    setUserToDelete(userId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteFakeUser = async () => {
    try {
      await axiosInstance.delete(`/api/admin/fake-users/${userToDelete}`);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      
      if (onSuccess) {
        onSuccess({ message: 'Fake user deleted successfully' });
      }
    } catch (err) {
      console.error('Failed to delete fake user:', err);
      alert('Failed to delete fake user: ' + 
        (err.response?.data?.error || err.message || 'Unknown error'));
    }
  };

  // Generate random avatar URLs
  const generateRandomAvatar = () => {
    const avatarTypes = ['bottts', 'avataaars', 'jdenticon', 'identicon'];
    const type = avatarTypes[Math.floor(Math.random() * avatarTypes.length)];
    const randomSeed = Math.random().toString(36).substring(2, 8);
    const url = `https://avatars.dicebear.com/api/${type}/${randomSeed}.svg`;
    
    setFormData(prev => ({
      ...prev,
      avatar_url: url
    }));
  };

  // Find fake users in the members list
  const fakeUsers = members?.filter(member => 
    member.User?.email?.startsWith('fake-test-user') || 
    member.User?.username?.includes('[FAKE-')
  ) || [];

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<PersonAddIcon />}
        onClick={handleOpen}
        sx={{ mb: 2 }}
      >
        Add Fake Test User
      </Button>
      
      {fakeUsers.length > 0 && (
        <Box sx={{ mt: 2, mb: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Existing Fake Users:
          </Typography>
          {fakeUsers.map(member => (
            <Box 
              key={member.user_id || member.User?.id} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                mb: 1,
                borderRadius: 1,
                bgcolor: 'rgba(25, 118, 210, 0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{member.User?.username || member.username}</Typography>
                <Chip 
                  size="small" 
                  label={member.role || member.User?.role} 
                  sx={{ backgroundColor: 'rgba(25, 118, 210, 0.2)' }}
                />
              </Box>
              <Tooltip title="Delete fake user">
                <IconButton 
                  color="error" 
                  size="small"
                  onClick={() => openDeleteConfirm(member.user_id || member.User?.id)}
                >
                  <DeleteForeverIcon />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}
      
      {/* Create user dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Fake User to {guildName || 'Guild'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a fake user for testing purposes. This user will be added directly to the selected guild.
          </Typography>
          
          <TextField
            name="username"
            label="Username"
            fullWidth
            value={formData.username}
            onChange={handleChange}
            margin="normal"
            required
          />
          
          <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
            <TextField
              name="avatar_url"
              label="Avatar URL"
              fullWidth
              value={formData.avatar_url}
              onChange={handleChange}
              margin="normal"
              helperText="Leave blank for default avatar"
            />
            <Button 
              variant="outlined" 
              onClick={generateRandomAvatar}
              sx={{ ml: 1, height: 40, mt: 2 }}
            >
              Random
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                {ROLE_OPTIONS.map(role => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              name="combat_power"
              label="Combat Power"
              type="number"
              fullWidth
              value={formData.combat_power}
              onChange={handleChange}
              margin="normal"
              inputProps={{ min: 0, max: 9999 }}
            />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="caption" color="text.secondary">
            Note: Fake users are for testing only and will be visible to all guild members.
            They cannot log in and can only be managed through the admin panel.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading || !formData.username}
            endIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Add Fake User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this fake test user?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteFakeUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddFakeUserForm;