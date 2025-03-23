import { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle,
  DialogContent, 
  DialogActions,
  Typography, 
  Box, 
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';

const InviteLinkButton = () => {
  const [open, setOpen] = useState(false);
  const [guildId, setGuildId] = useState('');
  const [guildName, setGuildName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  // Check if user is a guild master or has admin permissions
  const canManageInvites = user && ['Guild Master', 'Guild Advisor'].includes(user.role);

  useEffect(() => {
    // Reset state when dialog opens
    if (open) {
      fetchGuildInfo();
    }
  }, [open]);

  const fetchGuildInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentGuildId = localStorage.getItem('guildId');
      if (!currentGuildId) {
        throw new Error('No guild ID found');
      }
      
      setGuildId(currentGuildId);
      
      // Fetch guild details to get name
      const guildResponse = await axiosInstance.get(`/api/guilds/${currentGuildId}`);
      if (guildResponse.data && guildResponse.data.name) {
        setGuildName(guildResponse.data.name);
      }
    } catch (error) {
      console.error('Failed to fetch guild info:', error);
      setError(error.message || 'Failed to fetch guild information');
    } finally {
      setLoading(false);
    }
  };

  // Generate application URL
  const getApplicationUrl = () => {
    return `${window.location.origin}/guild-apply?guildId=${guildId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setSnackbarMessage('Copied to clipboard!');
        setSnackbarOpen(true);
        
        // Reset success state after 2 seconds
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setSnackbarMessage('Failed to copy to clipboard');
        setSnackbarOpen(true);
      });
  };

  // Don't show the button if user doesn't have permission
  if (!canManageInvites) {
    return null;
  }

  return (
    <>
      <Button 
        variant="contained" 
        onClick={() => setOpen(true)}
        startIcon={<GroupAddIcon />}
        sx={{
          bgcolor: '#90caf9',
          color: '#1a1a1a',
          fontWeight: 'bold',
          px: isMobile ? 2 : 4,
          py: 1.5,
          minHeight: '44px', // Minimum touch target size
          fontSize: isMobile ? '0.875rem' : 'inherit',
          whiteSpace: 'nowrap',
          borderRadius: '8px',
          '&:hover': {
            bgcolor: '#64b5f6',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 15px rgba(144, 202, 249, 0.4)'
          },
          transition: 'all 0.3s ease',
          width: isMobile ? '100%' : 'auto', // Full width on mobile
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        Invite Members
      </Button>
      
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            margin: isMobile ? '16px' : null,
            width: isMobile ? 'calc(100% - 32px)' : null
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#90caf9', 
          fontWeight: 'bold',
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          pb: 2,
          display: 'flex',
          alignItems: 'center'
        }}>
          <HowToRegIcon sx={{ mr: 2 }} />
          Invite Members to {guildName}
        </DialogTitle>
        
        <DialogContent sx={{ py: 3, px: isMobile ? 2 : 4 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#90caf9' }} />
            </Box>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)' }}>
                  {error}
                </Alert>
              )}
              
              <Box sx={{ 
                p: 2, 
                mb: 3, 
                bgcolor: 'rgba(144, 202, 249, 0.05)', 
                borderRadius: '8px',
                border: '1px solid rgba(144, 202, 249, 0.2)'
              }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  This application process allows you to review players before they join your guild. It's the recommended approach for public recruiting.
                </Typography>
              </Box>
              
              <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center' }}>
                <HowToRegIcon sx={{ mr: 1 }} /> Application Link
              </Typography>
              
              <Box sx={{ 
                bgcolor: 'rgba(0,0,0,0.2)', 
                p: 2, 
                borderRadius: '8px',
                border: '1px solid rgba(144, 202, 249, 0.5)',
                wordBreak: 'break-all',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                color: 'white',
                mb: 2,
                position: 'relative'
              }}>
                {getApplicationUrl()}
                <Tooltip title="Copy to clipboard">
                  <IconButton 
                    onClick={() => copyToClipboard(getApplicationUrl())}
                    size="small"
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: copySuccess ? '#4caf50' : '#90caf9',
                      bgcolor: 'rgba(0,0,0,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.5)'
                      },
                      transition: 'color 0.3s ease'
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                This application link is safe to share publicly on social media, Discord servers, and guild recruitment forums.
              </Alert>
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 2, 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          bgcolor: 'rgba(30, 30, 30, 0.7)'
        }}>
          <Button 
            onClick={() => setOpen(false)} 
            variant="outlined"
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Close
          </Button>
          
          <Button 
            onClick={() => copyToClipboard(getApplicationUrl())}
            variant="contained"
            startIcon={<ContentCopyIcon />}
            sx={{
              bgcolor: '#90caf9',
              color: '#1a1a1a',
              '&:hover': {
                bgcolor: '#64b5f6'
              }
            }}
          >
            Copy Link
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          sx={{ width: '100%' }}
          onClose={() => setSnackbarOpen(false)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InviteLinkButton;