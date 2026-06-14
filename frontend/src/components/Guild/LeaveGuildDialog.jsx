// frontend/src/components/Guild/LeaveGuildDialog.jsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import API_URL from '../../config/apiUrl';

const LeaveGuildDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmError, setConfirmError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLeaveGuild = async () => {
    setLoading(true);
    setError(null);
    
    // Validate confirmation text
    if (confirmationText !== "Leave guild") {
      setConfirmError(true);
      setLoading(false);
      return;
    }
    
    // Extract guild ID
    let guildId = null;
    
    // Try to get from URL first
    const pathParts = window.location.pathname.split('/');
    const guildIdIndex = pathParts.indexOf('guilds') + 1;
    if (guildIdIndex > 0 && guildIdIndex < pathParts.length) {
      guildId = pathParts[guildIdIndex];
    }
    
    // If not found in URL, try localStorage
    if (!guildId) {
      try {
        guildId = localStorage.getItem('guildId');
      } catch (e) {
        console.warn('Failed to access localStorage:', e);
      }
    }
    
    if (!guildId) {
      console.error('No guild ID found');
      window.location.href = '/guilds/setup';
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/guilds/leave/${guildId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to leave guild');
      }
      
      // Clear the guild ID from localStorage
      try {
        localStorage.removeItem('guildId');
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Redirect to guild setup page with a full page reload
      window.location.href = '/guilds/setup';
    } catch (error) {
      console.error('Failed to leave guild:', error);
      setError(error.message || 'Failed to leave guild');
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      PaperProps={{
        sx: { bgcolor: '#1e1e1e', color: 'white' }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#1a1a1a', 
        color: 'white',
        padding: isMobile ? '16px 12px' : '16px 24px'
      }}>
        Leave Guild?
      </DialogTitle>
      <DialogContent sx={{ 
        bgcolor: '#1e1e1e', 
        pt: 2,
        padding: isMobile ? '16px 12px' : '16px 24px'
      }}>
        <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Are you sure you want to leave this guild? This action cannot be undone.
        </DialogContentText>
        
        <TextField
          fullWidth
          label="Type 'Leave guild' to confirm"
          variant="outlined"
          value={confirmationText}
          onChange={(e) => {
            setConfirmationText(e.target.value);
            setConfirmError(false);
          }}
          error={confirmError}
          helperText={confirmError ? "You must type 'Leave guild' exactly" : ""}
          margin="normal"
          sx={{
            mt: 2,
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
            },
            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
          }}
          inputProps={{
            style: { 
              fontSize: isMobile ? '16px' : 'inherit' // Prevent zoom on mobile
            }
          }}
        />
        
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ 
        bgcolor: '#1e1e1e',
        padding: isMobile ? '12px' : '16px 24px',
        flexDirection: isMobile ? 'column' : 'row',
        '& > button': {
          marginLeft: isMobile ? '0 !important' : undefined,
          marginTop: isMobile ? 1 : 0,
          width: isMobile ? '100%' : 'auto'
        }
      }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{ 
            color: 'white',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleLeaveGuild} 
          color="error" 
          variant="contained"
          disabled={loading || confirmationText !== "Leave guild"}
          sx={{
            width: isMobile ? '100%' : 'auto'
          }}
        >
          {loading ? 'Leaving...' : 'Leave Guild'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveGuildDialog;