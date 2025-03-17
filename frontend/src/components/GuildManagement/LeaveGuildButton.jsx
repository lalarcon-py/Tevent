// components/GuildManagement/LeaveGuildButton.jsx
import { useState } from 'react';
import { 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  TextField,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : process.env.REACT_APP_API_URL;

const LeaveGuildButton = ({ guildId, currentUserRole }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmError, setConfirmError] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setConfirmationText('');
    setConfirmError(false);
  };

  const handleLeaveGuild = async () => {
    setLoading(true);
    setError(null);
    
    // Validate confirmation text
    if (confirmationText !== "Leave guild") {
      setConfirmError(true);
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/guilds/leave/${guildId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave guild');
      }
      
      // Clear guild ID from localStorage
      try {
        localStorage.removeItem('guildId');
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Redirect to guild selection page
      window.location.href = '/guilds/setup';
    } catch (error) {
      console.error('Failed to leave guild:', error);
      setError(error.message || 'Failed to leave guild');
      setLoading(false);
    }
  };

  const isGuildMaster = currentUserRole === 'Guild Master';

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        onClick={handleOpen}
        startIcon={<ExitToAppIcon />}
        sx={{
          borderRadius: '8px',
          fontWeight: 'bold',
          py: isMobile ? 1 : 1.5,
          px: isMobile ? 2 : 3,
          fontSize: isMobile ? '0.875rem' : 'inherit',
          minHeight: '44px', // Minimum touch target size
          '&:hover': {
            bgcolor: 'rgba(244, 67, 54, 0.1)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 15px rgba(244, 67, 54, 0.2)'
          },
          transition: 'all 0.3s ease',
          width: isMobile ? '100%' : 'auto' // Full width on mobile
        }}
      >
        Leave Guild
      </Button>
      
      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            margin: isMobile ? '16px' : null,
            width: isMobile ? 'calc(100% - 32px)' : null,
            maxHeight: isMobile ? 'calc(100% - 32px)' : null
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#1a1a1a', 
          color: 'white',
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          py: 2
        }}>
          Leave Guild?
        </DialogTitle>
        <DialogContent sx={{ 
          bgcolor: '#1e1e1e', 
          pt: 2,
          px: isMobile ? 2 : 3
        }}>
          <DialogContentText sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: isMobile ? '0.9rem' : 'inherit'
          }}>
            Are you sure you want to leave this guild? This action cannot be undone.
            {isGuildMaster && (
              <Typography 
                color="error" 
                sx={{ 
                  mt: 2, 
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.875rem' : 'inherit'
                }}
              >
                As the Guild Master, your role will be transferred to another member if possible. 
                If you're the only member, the guild will be scheduled for deletion.
              </Typography>
            )}
          </DialogContentText>
          
          {/* Add confirmation text field */}
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
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .MuiFormHelperText-root': {
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                marginBottom: isMobile ? 0 : 2
              }
            }}
          />
          
          {error && (
            <Typography 
              color="error" 
              sx={{ 
                mt: 2,
                fontSize: isMobile ? '0.875rem' : 'inherit'
              }}
            >
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: '#1e1e1e',
          p: isMobile ? 2 : 3,
          flexDirection: isMobile ? 'column' : 'row',
          '& > :not(:first-of-type)': {
            mt: isMobile ? 1 : 0
          }
        }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ 
              color: 'white',
              width: isMobile ? '100%' : 'auto',
              py: isMobile ? 1 : null
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
              width: isMobile ? '100%' : 'auto',
              py: isMobile ? 1 : null,
              minHeight: '36px'
            }}
          >
            {loading ? 'Leaving...' : 'Leave Guild'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LeaveGuildButton;