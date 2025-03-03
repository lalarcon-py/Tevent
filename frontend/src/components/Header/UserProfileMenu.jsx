// components/Header/UserProfileMenu.jsx
import { useState, useEffect } from 'react';
import { 
  Menu, MenuItem, Divider, Typography, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, TextField, Box,
  ListItemIcon, ListItemText, Avatar, Link, AlertDialog
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import LinkIcon from '@mui/icons-material/Link';
import { useAuth } from '../../contexts/AuthContext';
import LeaveGuildDialog from '../Guild/LeaveGuildDialog';


const UserProfileMenu = ({ anchorEl, open, handleClose }) => {
  const { user, logout } = useAuth();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openGearDialog, setOpenGearDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [gearImage, setGearImage] = useState(null);
  const [questlogUrl, setQuestlogUrl] = useState('');
  const [openLeaveGuildDialog, setOpenLeaveGuildDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteConfirmError, setDeleteConfirmError] = useState(false);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user, open]);

  // Dialog handlers
  const handleEditDialogOpen = () => {
    setOpenEditDialog(true);
    handleClose();
  };
  
  const handleDeleteDialogOpen = () => {
    setOpenDeleteDialog(true);
    handleClose();
  };
  
  const handleGearDialogOpen = () => {
    setOpenGearDialog(true);
    handleClose();
  };
  
  const handleLinkDialogOpen = () => {
    setOpenLinkDialog(true);
    handleClose();
  };
  
  const handleLeaveGuild = async () => {
    // Extract guild ID from URL or localStorage
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
      handleClose(); // Close the menu first
      
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000'
        : process.env.REACT_APP_API_URL || window.location.origin;
      
      const response = await fetch(`${baseUrl}/api/guilds/leave/${guildId}`, {
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
      // Still try to redirect on error
      window.location.href = '/guilds/setup';
    }
  };
  
  // Form submission handlers
  const handleUsernameSubmit = async () => {
    try {
      if (!user || !user.id) {
        console.error('User ID not found');
        return;
      }
      
      setOpenEditDialog(false);
      
      // Use the existing members API endpoint instead of a non-existent user update endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/members/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for authentication
        body: JSON.stringify({
          id: user.id,
          username: username,
          // Preserve other user data
          role: user.role,
          discord_id: user.discord_id,
          status: user.status,
          avatar_url: user.avatar_url,
          builds: user.builds,
          combat_power: user.combat_power
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to update username');
      }
      
      // Show success message or update local state if needed
      console.log('Username updated successfully');
      
      // Force refresh to show updated name in MembersList
      // This approach ensures the MembersList component gets the updated data from the server
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to update username:', error);
      // You could set an error state here to show to the user
    }
  };
  
  const handleGearSubmit = async () => {
    if (!gearImage) return;
    
    const formData = new FormData();
    formData.append('gearImage', gearImage);
    
    try {
      // API call to upload gear image
      await fetch('/api/user/gear-screenshot', {
        method: 'POST',
        body: formData,
      });
      setOpenGearDialog(false);
      setGearImage(null);
    } catch (error) {
      console.error('Failed to upload gear screenshot:', error);
    }
  };
  
  const handleLinkSubmit = async () => {
    try {
      // API call to save questlog link
      await fetch('/api/user/external-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questlogUrl }),
      });
      setOpenLinkDialog(false);
    } catch (error) {
      console.error('Failed to save questlog link:', error);
    }
  };
  
  const handleAccountDelete = async () => {
    if (deleteConfirmation !== "DELETE") {
      setDeleteConfirmError(true);
      return;
    }
    
    try {
      setOpenDeleteDialog(false); // Close the dialog first
      
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000'
        : process.env.REACT_APP_API_URL || window.location.origin;
        
      console.log('Attempting to delete account...');
      
      // API call to delete account
      const response = await fetch(`${baseUrl}/api/user/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
      
      console.log('Account deleted successfully');
      
      // Clear all data from localStorage
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Log the user out
      if (typeof logout === 'function') {
        await logout();
      }
      
      // Force a full page reload and redirect to home
      alert('Your account has been deleted successfully.');
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert(`Failed to delete account: ${error.message}`);
    }
  };

  const handleLeaveGuildDialogOpen = () => {
    setOpenLeaveGuildDialog(true);
    handleClose();
  };
  
  const handleFileChange = (event) => {
    setGearImage(event.target.files[0]);
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 240,
            maxWidth: '100%',
            mt: 1.5,
            bgcolor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ mr: 1, width: 40, height: 40 }}
            src={user?.avatar_url}
          />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
              {user?.username || 'User'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {user?.email || 'No email provided'}
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        
        <MenuItem onClick={handleEditDialogOpen} sx={{ color: 'white' }}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Edit In-Game Name</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleGearDialogOpen} sx={{ color: 'white' }}>
          <ListItemIcon>
            <PhotoCameraIcon fontSize="small" sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Upload Gear Screenshot</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleLinkDialogOpen} sx={{ color: 'white' }}>
          <ListItemIcon>
            <LinkIcon fontSize="small" sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Link Questlog.gg</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleLeaveGuildDialogOpen} sx={{ color: 'white' }}>
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" sx={{ color: '#ff9800' }} />
          </ListItemIcon>
          <ListItemText>Leave Guild</ListItemText>
        </MenuItem>
        
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        
        <MenuItem onClick={handleDeleteDialogOpen} sx={{ color: '#f44336' }}>
          <ListItemIcon>
            <DeleteForeverIcon fontSize="small" sx={{ color: '#f44336' }} />
          </ListItemIcon>
          <ListItemText>Delete Account</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Edit Name Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle>Edit In-Game Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleUsernameSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Gear Screenshot Dialog */}
      <Dialog 
        open={openGearDialog} 
        onClose={() => setOpenGearDialog(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle>Upload Gear Screenshot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please upload a screenshot of your in-game gear to help guild officers with planning and progression.
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="gear-screenshot-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="gear-screenshot-upload">
              <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />}>
                Select Screenshot
              </Button>
            </label>
            {gearImage && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {gearImage.name}
              </Typography>
            )}
          </Box>
          
          {gearImage && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <img 
                src={URL.createObjectURL(gearImage)} 
                alt="Gear Preview" 
                style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGearDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleGearSubmit} 
            variant="contained" 
            color="primary"
            disabled={!gearImage}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Questlog Link Dialog */}
      <Dialog 
        open={openLinkDialog} 
        onClose={() => setOpenLinkDialog(false)}
        PaperProps={{
          sx: { bgcolor: '#1e1e1e', color: 'white' }
        }}
      >
        <DialogTitle>Link Questlog.gg Profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Provide your Questlog.gg profile URL to share with guild members.
          </Typography>
          
          <TextField
            margin="dense"
            label="Questlog.gg URL"
            placeholder="https://questlog.gg/profile/your-username"
            fullWidth
            variant="outlined"
            value={questlogUrl}
            onChange={(e) => setQuestlogUrl(e.target.value)}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
            }}
          />
          
          <Box sx={{ mt: 2 }}>
            <Link 
              href="https://questlog.gg" 
              target="_blank" 
              rel="noopener"
              sx={{ color: '#90caf9' }}
            >
              Visit Questlog.gg to create a profile
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleLinkSubmit} 
            variant="contained" 
            color="primary"
            disabled={!questlogUrl}
          >
            Save Link
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Account Dialog */}
      <Dialog 
            open={openDeleteDialog} 
            onClose={() => setOpenDeleteDialog(false)}
            PaperProps={{
              sx: { bgcolor: '#1e1e1e', color: 'white' }
            }}
          >
            <DialogTitle sx={{ color: '#f44336' }}>
              ⚠️ Delete Account Permanently
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you absolutely sure you want to delete your account? This action cannot be undone.
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                Your account data, guild memberships, and all associated information will be permanently removed.
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'rgba(244, 67, 54, 0.1)', 
                borderRadius: 1,
                border: '1px solid rgba(244, 67, 54, 0.3)'
              }}>
                <Typography variant="subtitle2">
                  To confirm, please type "DELETE" below:
                </Typography>
                <TextField
                  margin="dense"
                  fullWidth
                  variant="outlined"
                  value={deleteConfirmation}
                  onChange={(e) => {
                    setDeleteConfirmation(e.target.value);
                    setDeleteConfirmError(false);
                  }}
                  error={deleteConfirmError}
                  helperText={deleteConfirmError ? "You must type 'DELETE' exactly" : ""}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                    },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                Cancel
              </Button>
              <Button 
                onClick={handleAccountDelete} 
                variant="contained" 
                color="error"
                disabled={deleteConfirmation !== "DELETE"}
              >
                Delete Forever
              </Button>
            </DialogActions>
          </Dialog>
      
      <LeaveGuildDialog 
        open={openLeaveGuildDialog}
        onClose={() => setOpenLeaveGuildDialog(false)}
      />
    </>
  );
};

export default UserProfileMenu;