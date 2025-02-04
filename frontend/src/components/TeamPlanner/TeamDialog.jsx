// frontend/src/components/TeamPlanner/TeamDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography
} from '@mui/material';

const TeamDialog = ({ open, team, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (team) {
      setName(team.name);
    } else {
      setName('');
    }
    setError('');
  }, [team, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Team name is required');
      return;
    }

    onSave({ name: trimmedName });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { bgcolor: '#1e1e1e', minWidth: 400 }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ color: 'white' }}>
          {team ? 'Edit Team' : 'Create Team'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Team Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              error={Boolean(error)}
              helperText={error}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                  '&.Mui-error fieldset': {
                    borderColor: '#f44336',
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-error': {
                    color: '#f44336',
                  }
                },
                '& .MuiFormHelperText-root': {
                  color: '#f44336',
                }
              }}
            />
          </Box>

          {team && (
            <Box sx={{ mt: 2 }}>
              <Typography 
                variant="caption" 
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                Members will be kept when renaming the team
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={onClose}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.08)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={!name.trim()}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': {
                bgcolor: '#45a049'
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(76, 175, 80, 0.3)'
              }
            }}
          >
            {team ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TeamDialog;