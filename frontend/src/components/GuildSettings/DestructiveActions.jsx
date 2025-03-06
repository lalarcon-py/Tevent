// components/GuildSettings/DestructiveActions.jsx
import { useState } from 'react';
import { 
  Box, Typography, Divider, Paper, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../config/axios';

const DestructiveActions = ({ guildData, guildId }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  
  const handleDeleteGuild = async () => {
    if (confirmText !== guildData.name) {
      setDeleteError(`Please type "${guildData.name}" to confirm deletion`);
      return;
    }
    
    setDeleteError(null);
    setIsDeleting(true);
    
    try {
      // Configure axios with timeout and better error handling
      await axiosInstance.delete(`/api/guilds/${guildId}`, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // Clear guild ID from localStorage
      try {
        localStorage.removeItem('guildId');
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      setDeleteDialogOpen(false);
      
      // Use window.location instead of navigate to ensure a full page reload
      window.location.href = '/guilds/setup';
    } catch (error) {
      console.error('Delete guild error:', error);
      setIsDeleting(false);
      
      // Provide more detailed error message
      const errorMessage = error.response?.data?.error || 
                          'Failed to delete guild. Please try again.';
      setDeleteError(errorMessage);
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Destructive Actions
      </Typography>
      
      <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        Actions in this section are permanent and cannot be undone. Proceed with caution.
      </Alert>
      
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'rgba(244, 67, 54, 0.1)',
        border: '1px solid rgba(244, 67, 54, 0.3)'
      }}>
        <Typography variant="subtitle1" gutterBottom sx={{ color: 'white' }}>
          Delete Guild
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
          Permanently delete this guild and all associated data. All members will be removed, and all guild data will be lost.
        </Typography>
        
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setDeleteDialogOpen(true)}
          sx={{
            py: 1,
            bgcolor: 'rgba(244, 67, 54, 0.8)',
            '&:hover': {
              bgcolor: 'rgba(244, 67, 54, 1)'
            }
          }}
        >
          Delete Guild
        </Button>
      </Paper>
      
      {/* Delete Guild Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle sx={{ color: '#f44336' }}>
          ⚠️ Delete Guild Permanently
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you absolutely sure you want to delete the guild <strong>{guildData?.name}</strong>?
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            This action cannot be undone. This will permanently delete the guild, remove all members, and delete all guild data including events, items, and settings.
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: 'rgba(244, 67, 54, 0.1)', 
            borderRadius: 1,
            border: '1px solid rgba(244, 67, 54, 0.3)',
            mb: 2
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              To confirm, please type <strong>{guildData?.name}</strong> below:
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                },
              }}
            />
          </Box>
          
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteGuild} 
            variant="contained" 
            color="error"
            disabled={isDeleting || confirmText !== guildData?.name}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete Forever'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DestructiveActions;