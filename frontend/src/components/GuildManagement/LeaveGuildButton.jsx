import { useState } from 'react';
import { 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : process.env.REACT_APP_API_URL;

const LeaveGuildButton = ({ guildId, currentUserRole }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleLeaveGuild = async () => {
    setLoading(true);
    setError(null);
    
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
      
      // Redirect to guild selection page
      navigate('/guilds/setup');
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
          '&:hover': {
            bgcolor: 'rgba(244, 67, 54, 0.1)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 15px rgba(244, 67, 54, 0.2)'
          },
          transition: 'all 0.3s ease'
        }}
      >
        Leave Guild
      </Button>
      
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          Leave Guild?
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Are you sure you want to leave this guild? This action cannot be undone.
            {isGuildMaster && (
              <Typography color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
                As the Guild Master, your role will be transferred to another member if possible. 
                If you're the only member, the guild will be scheduled for deletion.
              </Typography>
            )}
          </DialogContentText>
          
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1e1e1e' }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ color: 'white' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLeaveGuild} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Leaving...' : 'Leave Guild'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LeaveGuildButton;