// Updated MemberProfileModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  CircularProgress,
  Button,
  TextField,
  DialogActions,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import BuildIcon from '@mui/icons-material/Build';
import ListAltIcon from '@mui/icons-material/ListAlt';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';

// Name edit dialog component
const NameEditDialog = ({ open, onClose, member, onSave }) => {
  const [newName, setNewName] = useState(member?.username || '');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleSave = () => {
    if (newName.trim() && newName !== member.username) {
      onSave(newName);
    } else {
      onClose();
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { 
          bgcolor: '#1e1e1e', 
          color: 'white',
          margin: isMobile ? '16px' : null,
          width: isMobile ? 'calc(100% - 32px)' : null
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#1a1a1a', 
        color: 'white',
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        py: 2
      }}>
        Edit Username
      </DialogTitle>
      <DialogContent sx={{ pt: 2, pb: 2 }}>
        <TextField
          fullWidth
          label="New Username"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          margin="dense"
          sx={{ 
            input: { color: 'white' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
              '&.Mui-focused fieldset': { borderColor: '#90caf9' }
            },
            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'white' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!newName.trim() || newName === member.username}
          sx={{ 
            bgcolor: '#90caf9',
            '&:hover': { bgcolor: '#64b5f6' }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MemberProfileModal = ({ member, open, onClose, onUpdate }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [isDkpEnabled, setIsDkpEnabled] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Gear check states
  const [gearCheckStatus, setGearCheckStatus] = useState('none'); // none, requested, pending, approved, denied
  const [gearCheckImage, setGearCheckImage] = useState(null);
  const [gearCheckDenialReason, setGearCheckDenialReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [denialDialog, setDenialDialog] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    if (open && member) {
      loadMemberData();
      fetchGearCheckStatus();
    }
  }, [open, member]);

  const loadMemberData = async () => {
    if (!member) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get guild ID from storage
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        setError('Guild ID not found. Please refresh the page.');
        setLoading(false);
        return;
      }
      
      // Load wishlist items
      try {
        const wishlistResponse = await axiosInstance.get(`/api/wishlist/user/${member.id}`, {
          params: { guildId }
        });
        setWishlistItems(wishlistResponse.data || []);
      } catch (wishlistError) {
        console.error('Failed to load wishlist data:', wishlistError);
        // Don't fail completely if just wishlist fails
      }
      
      // Load attendance data
      try {
        const attendanceResponse = await axiosInstance.get(`/api/stats/user/${member.id}/attendance`, {
          params: { guildId }
        });

        const isDkpEnabled = attendanceResponse.data.dkp_enabled;
        const attendanceData = attendanceResponse.data.attendance || [];
        
        setAttendanceData(attendanceData);
        setIsDkpEnabled(isDkpEnabled);
      } catch (attendanceError) {
        console.error('Failed to load attendance data:', attendanceError);
        setAttendanceData([]);
        setIsDkpEnabled(false);
        
        // Use mock data as a fallback until the endpoint is implemented
        const mockAttendanceData = [
          {
            id: '1',
            event: { title: 'Weekly Raid', event_time: new Date().toISOString() },
            attended: true,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            dkp_earned: 10
          },
          {
            id: '2',
            event: { title: 'Guild Meeting', event_time: new Date().toISOString() },
            attended: true,
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            dkp_earned: 5
          }
        ];
        
        // Use mock data if the endpoint returns 404 (not implemented yet)
        // This is temporary until the API endpoint is implemented
        if (attendanceError.response && attendanceError.response.status === 404) {
          console.log('Using mock attendance data until endpoint is implemented');
          setAttendanceData(mockAttendanceData);
        } else {
          // For other errors, just set an empty array
          setAttendanceData([]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load member data:', error);
      setError('Could not load all member information');
      setLoading(false);
    }
  };

  const fetchGearCheckStatus = async () => {
    if (!member) return;
    
    try {
      // Get guild ID from storage
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      // Get the user's data to check for gear screenshot
      const response = await axiosInstance.get(`/api/members/${member.id}`, {
        params: { guildId }
      });
      
      if (response.data && response.data.gear_screenshot_url) {
        setGearCheckStatus('approved'); // If there's a screenshot, consider it approved
        setGearCheckImage(response.data.gear_screenshot_url);
      } else {
        setGearCheckStatus('none');
      }
    } catch (error) {
      console.error('Failed to fetch gear check status:', error);
      setGearCheckStatus('none');
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const canAdminGearCheck = () => {
    if (!user) return false;
    const adminRoles = ['Guild Master', 'Guild Advisor', 'Guild Guardian'];
    return adminRoles.includes(user.role);
  };

  const requestGearCheck = async () => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId) return;
      
      /* Uncomment when backend endpoint is ready
      await axiosInstance.post(`/api/gear-check/request`, {
        userId: member.id,
        guildId
      });
      */
      
      // Mock response
      setGearCheckStatus('requested');
      alert('Gear check request feature coming soon!');
    } catch (error) {
      console.error('Failed to request gear check:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB max size

      if (!validTypes.includes(file.type)) {
        alert('Please upload an image file (JPEG, PNG, GIF)');
        return;
      }

      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 5MB.');
        return;
      }

      setUploadedFile(file);
    }
  };

  const uploadGearCheck = async () => {
    if (!uploadedFile) return;
    
    try {
      /* Uncomment when backend endpoint is ready
      const formData = new FormData();
      formData.append('image', uploadedFile);
      formData.append('userId', member.id);
      formData.append('guildId', localStorage.getItem('guildId'));
      
      const response = await axiosInstance.post(`/api/gear-check/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      */
      
      // Mock response
      setGearCheckStatus('pending');
      alert('Gear check upload feature coming soon!');
      setUploadedFile(null);
    } catch (error) {
      console.error('Failed to upload gear check:', error);
    }
  };

  const approveGearCheck = async () => {
    try {
      /* Uncomment when backend endpoint is ready
      const guildId = localStorage.getItem('guildId');
      await axiosInstance.post(`/api/gear-check/${member.id}/approve`, {
        guildId
      });
      */
      
      // Mock response
      setGearCheckStatus('approved');
      alert('Gear check approval feature coming soon!');
    } catch (error) {
      console.error('Failed to approve gear check:', error);
    }
  };

  const denyGearCheck = async () => {
    if (!denialReason.trim()) return;
    
    try {
      /* Uncomment when backend endpoint is ready
      const guildId = localStorage.getItem('guildId');
      await axiosInstance.post(`/api/gear-check/${member.id}/deny`, {
        reason: denialReason,
        guildId
      });
      */
      
      // Mock response
      setGearCheckStatus('denied');
      setGearCheckDenialReason(denialReason);
      setDenialReason('');
      setDenialDialog(false);
      alert('Gear check denial feature coming soon!');
    } catch (error) {
      console.error('Failed to deny gear check:', error);
    }
  };

  const handleNameChange = async (newName) => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      const response = await axiosInstance.put(`/api/guilds/members/${member.id}/update-name`, {
        username: newName,
        guildId
      });
      
      if (response.status === 200) {
        // If provided, call the onUpdate prop to update the parent component
        if (onUpdate) {
          onUpdate({
            ...member,
            username: newName
          });
        }
        
        // Update the local member object to show the updated name
        // Change starts here
        member.username = newName; // Directly update the member object (which is passed by reference)
        
        // Close the name edit dialog
        setNameEditOpen(false);
        
        // Force a refresh of the component's data from the server
        // This ensures everything is in sync
        loadMemberData();
      }
    } catch (error) {
      console.error('Error updating username:', error);
      alert(`Failed to update username: ${error.response?.data?.error || error.message}`);
    }
  };

  const getWeaponIcon = (weaponName) => {
    if (!weaponName) return null;
    const formattedName = weaponName.replace(/\s+/g, ' ').trim();
    return `${process.env.PUBLIC_URL}/weapons/${formattedName} Art.png`;
  };

  const getWeaponSpec = (primary, secondary) => {
    const WEAPON_SPECS = {
      'Crossbow|Dagger': 'Scorpion',
      'Crossbow|Greatsword': 'Outrider',
      'Crossbow|Sword and Shield': 'Raider',
      'Crossbow|Bow': 'Scout',
      'Crossbow|Staff': 'Battleweaver',
      'Crossbow|Wand': 'Fury',
      'Greatsword|Wand': 'Paladin',
      'Greatsword|Dagger': 'Ravager',
      'Greatsword|Sword and Shield': 'Crusader',
      'Greatsword|Bow': 'Ranger',
      'Greatsword|Staff': 'Sentinel',
      'Sword and Shield|Dagger': 'Berserker',
      'Sword and Shield|Bow': 'Warden',
      'Sword and Shield|Staff': 'Disciple',
      'Sword and Shield|Wand': 'Templar',
      'Bow|Dagger': 'Infiltrator',
      'Bow|Staff': 'Liberator',
      'Bow|Wand': 'Seeker',
      'Staff|Dagger': 'Spellblade',
      'Staff|Wand': 'Invocator',
      'Wand|Dagger': 'Darkblighter',
      'Spear|Greatsword': 'Gladiator',
      'Spear|Sword and Shield': 'Steelheart',
      'Spear|Staff': 'Eradicator',
      'Spear|Dagger': 'Shadowdancer',
      'Spear|Crossbow': 'Cavalier',
      'Spear|Wand': 'Voidlance',
      'Spear|Bow': 'Impaler'
    };
    
    const combo1 = `${primary}|${secondary}`;
    const combo2 = `${secondary}|${primary}`;
    return WEAPON_SPECS[combo1] || WEAPON_SPECS[combo2] || 'Unknown Spec';
  };

  if (!member) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? 0 : '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          margin: isMobile ? 0 : null,
          width: isMobile ? '100%' : null,
          height: isMobile ? '100%' : null
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'rgba(25, 25, 25, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        p: isMobile ? 1.5 : 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? 1 : 2,
          width: isMobile ? 'calc(100% - 48px)' : 'auto' // Allow space for close button
        }}>
          <Avatar 
            src={member.avatarUrl || member.avatar_url}
            sx={{ 
              width: isMobile ? 36 : 48, 
              height: isMobile ? 36 : 48,
              border: '2px solid #90caf9'
            }}
          >
            {member.username?.[0] || '?'}
          </Avatar>
          <Box sx={{ 
            display: 'flex', 
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            overflow: 'hidden'
          }}>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              sx={{ 
                color: 'white',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: isMobile ? '200px' : '300px'
              }}
            >
              {member.username}
            </Typography>
            
            {/* Add pencil icon for name editing */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {(member.id === user?.id) && (
                <Tooltip title="Edit username">
                  <IconButton 
                    size="small" 
                    onClick={() => setNameEditOpen(true)}
                    sx={{ 
                      ml: isMobile ? 0 : 1,
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': { color: '#90caf9' },
                      padding: isMobile ? '2px' : '8px'
                    }}
                  >
                    <EditIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </Tooltip>
              )}
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#90caf9', 
                  ml: isMobile ? 0 : 1,
                  fontWeight: isMobile ? 500 : 400,
                  fontSize: isMobile ? '0.7rem' : '0.875rem'
                }}
              >
                {member.role}
              </Typography>
            </Box>
          </Box>
        </Box>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            color: 'white',
            padding: isMobile ? 1 : 'auto'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        variant={isMobile ? "scrollable" : "fullWidth"}
        scrollButtons={isMobile ? "auto" : false}
        allowScrollButtonsMobile
        sx={{
          backgroundColor: 'rgba(20, 20, 20, 0.6)',
          '& .MuiTab-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-selected': { color: '#90caf9' },
            minHeight: isMobile ? '48px' : '56px',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            minWidth: isMobile ? '80px' : '120px'
          },
          '& .MuiTabs-indicator': { backgroundColor: '#90caf9' }
        }}
      >
        <Tab 
          icon={<BuildIcon fontSize={isMobile ? "small" : "medium"} />} 
          label={isMobile ? "" : "Builds"} 
          iconPosition="start"
          aria-label="Builds"
        />
        <Tab 
          icon={<ListAltIcon fontSize={isMobile ? "small" : "medium"} />} 
          label={isMobile ? "" : "Wishlist"} 
          iconPosition="start"
          aria-label="Wishlist"
        />
        <Tab 
          icon={<EventIcon fontSize={isMobile ? "small" : "medium"} />} 
          label={isMobile ? "" : "Attendance"} 
          iconPosition="start"
          aria-label="Attendance"
        />
        <Tab 
          icon={<VerifiedUserIcon fontSize={isMobile ? "small" : "medium"} />} 
          label={isMobile ? "" : "Gear Check"} 
          iconPosition="start"
          aria-label="Gear Check"
        />
      </Tabs>
      
      <DialogContent sx={{ 
        p: isMobile ? 1.5 : 3, 
        backgroundColor: 'rgba(30, 30, 30, 0.4)',
        height: isMobile ? 'calc(100% - 120px)' : '500px',
        overflowY: 'auto'
      }}>
        {loading && currentTab < 3 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Builds Tab */}
            <Box sx={{ display: currentTab === 0 ? 'block' : 'none' }}>
              {member.builds && member.builds.length > 0 ? (
                <Grid container spacing={isMobile ? 1.5 : 3}>
                  {member.builds.map((build, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Paper sx={{ 
                        p: isMobile ? 1.5 : 2, 
                        backgroundColor: 'rgba(25, 25, 25, 0.6)',
                        border: '1px solid rgba(144, 202, 249, 0.2)',
                        borderRadius: '8px'
                      }}>
                        <Typography 
                          variant={isMobile ? "subtitle1" : "h6"} 
                          sx={{ 
                            color: '#90caf9', 
                            mb: 1,
                            fontSize: isMobile ? '1rem' : '1.25rem'
                          }}
                        >
                          {getWeaponSpec(build.primary, build.secondary)}
                        </Typography>
                        
                        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          mb: 2,
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: isMobile ? 1 : 0
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1
                          }}>
                            <img 
                              src={getWeaponIcon(build.primary)} 
                              alt={build.primary}
                              style={{ 
                                width: isMobile ? 28 : 36, 
                                height: isMobile ? 28 : 36
                              }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                            <Typography 
                              sx={{ 
                                color: 'white',
                                fontSize: isMobile ? '0.875rem' : '1rem'
                              }}
                            >
                              {build.primary}
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            justifyContent: isMobile ? 'flex-start' : 'flex-end'
                          }}>
                            <img 
                              src={getWeaponIcon(build.secondary)} 
                              alt={build.secondary}
                              style={{ 
                                width: isMobile ? 28 : 36, 
                                height: isMobile ? 28 : 36
                              }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                            <Typography 
                              sx={{ 
                                color: 'white',
                                fontSize: isMobile ? '0.875rem' : '1rem'
                              }}
                            >
                              {build.secondary}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={build.spec} 
                            sx={{ 
                              backgroundColor: build.spec === 'DPS' ? 'rgba(255, 102, 102, 0.2)' : 
                                            build.spec === 'Tank' ? 'rgba(102, 179, 255, 0.2)' : 
                                            'rgba(102, 255, 102, 0.2)',
                              color: build.spec === 'DPS' ? '#ff6666' : 
                                   build.spec === 'Tank' ? '#66b3ff' : 
                                   '#66ff66',
                              fontWeight: 'bold',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              height: isMobile ? '24px' : '32px'
                            }}
                          />
                        </Box>
                        
                        {member.combat_power && (
                          <Typography 
                            sx={{ 
                              textAlign: 'center', 
                              color: '#ffd700', 
                              mt: 2,
                              fontSize: isMobile ? '0.875rem' : '1rem'
                            }}
                          >
                            Combat Power: {member.combat_power}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  p: isMobile ? 2 : 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(25, 25, 25, 0.3)',
                  borderRadius: '8px'
                }}>
                  <Typography 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    No builds configured
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Wishlist Tab */}
            <Box sx={{ display: currentTab === 1 ? 'block' : 'none' }}>
              {wishlistItems.length > 0 ? (
                <List sx={{ 
                  backgroundColor: 'rgba(25, 25, 25, 0.4)', 
                  borderRadius: '8px',
                  p: isMobile ? 0 : undefined
                }}>
                  {wishlistItems.map((item) => (
                    <ListItem 
                      key={item.id}
                      sx={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        '&:last-child': { borderBottom: 'none' },
                        py: isMobile ? 1 : 2,
                        px: isMobile ? 1 : 2
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={item.Item?.icon}
                          sx={{ 
                            bgcolor: 'rgba(144, 202, 249, 0.1)',
                            border: '1px solid rgba(144, 202, 249, 0.2)',
                            width: isMobile ? 32 : 40, 
                            height: isMobile ? 32 : 40
                          }}
                        >
                          {item.Item?.name?.[0] || item.item_name?.[0] || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              flexWrap: 'wrap'
                            }}
                          >
                            <Typography 
                              sx={{ 
                                color: 'white',
                                fontSize: isMobile ? '0.875rem' : '1rem',
                                marginRight: 1,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                              }}
                            >
                              {item.Item?.name || item.item_name}
                            </Typography>
                            {item.priority > 0 && (
                              <Chip 
                                label={`${item.priority} DKP`} 
                                size="small"
                                sx={{ 
                                  ml: isMobile ? 0 : 1, 
                                  mt: isMobile ? 0.5 : 0,
                                  bgcolor: 'rgba(255, 215, 0, 0.2)',
                                  color: '#ffd700',
                                  height: isMobile ? '20px' : '24px',
                                  fontSize: isMobile ? '0.7rem' : '0.75rem'
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word'
                            }}
                          >
                            {item.Item?.type || item.item_type || 'Unknown'}
                            {item.notes && ` - ${item.notes}`}
                          </Typography>
                        }
                        primaryTypographyProps={{
                          sx: { 
                            fontSize: isMobile ? '0.875rem' : '1rem',
                            whiteSpace: 'normal'
                          }
                        }}
                        secondaryTypographyProps={{
                          sx: { 
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            whiteSpace: 'normal'
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ 
                  p: isMobile ? 2 : 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(25, 25, 25, 0.3)',
                  borderRadius: '8px'
                }}>
                  <Typography 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    No wishlist items found
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Attendance Tab */}
            <Box sx={{ display: currentTab === 2 ? 'block' : 'none' }}>
              {attendanceData.length > 0 ? (
                <>
                  <Box 
                    sx={{ 
                      mb: isMobile ? 2 : 3, 
                      p: isMobile ? 1.5 : 2, 
                      bgcolor: 'rgba(144, 202, 249, 0.1)', 
                      borderRadius: '8px' 
                    }}
                  >
                    <Typography 
                      variant={isMobile ? "subtitle1" : "h6"} 
                      sx={{ 
                        color: '#90caf9', 
                        mb: 1,
                        fontSize: isMobile ? '1rem' : '1.25rem'
                      }}
                    >
                      Attendance Summary
                    </Typography>
                    <Typography 
                      sx={{ 
                        color: 'white',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      Total Events: {attendanceData.length}
                    </Typography>
                    <Typography 
                      sx={{ 
                        color: 'white',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      Attendance Rate: {Math.round(attendanceData.filter(a => a.attended).length / attendanceData.length * 100)}%
                    </Typography>
                  </Box>
                
                  <List 
                    sx={{ 
                      backgroundColor: 'rgba(25, 25, 25, 0.4)', 
                      borderRadius: '8px',
                      p: isMobile ? 0 : undefined
                    }}
                  >
                    {attendanceData.slice(0, 10).map((attendance, index) => (
                      <ListItem 
                        key={attendance.id || index}
                        sx={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          '&:last-child': { borderBottom: 'none' },
                          py: isMobile ? 1 : 2,
                          px: isMobile ? 1 : 2
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: attendance.attended ? 'rgba(102, 255, 102, 0.2)' : 'rgba(255, 102, 102, 0.2)',
                              color: attendance.attended ? '#66ff66' : '#ff6666',
                              width: isMobile ? 32 : 40, 
                              height: isMobile ? 32 : 40
                            }}
                          >
                            {attendance.attended ? '✓' : '✗'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography 
                              sx={{ 
                                color: 'white',
                                fontSize: isMobile ? '0.875rem' : '1rem'
                              }}
                            >
                              {attendance.event?.title || 'Unknown Event'}
                            </Typography>
                          }
                          secondary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: isMobile ? '0.75rem' : '0.875rem'
                              }}
                            >
                              {new Date(attendance.event?.event_time || attendance.date).toLocaleString()}
                            </Typography>
                          }
                        />
                        {attendance.attended && isDkpEnabled && attendance.dkp_earned > 0 && (
                            <Chip 
                              label={`+${attendance.dkp_earned} DKP`} 
                              size="small"
                              sx={{ 
                                bgcolor: 'rgba(255, 215, 0, 0.2)',
                                color: '#ffd700',
                                height: isMobile ? '20px' : '24px',
                                fontSize: isMobile ? '0.7rem' : '0.75rem'
                              }}
                            />
                          )}
                      </ListItem>
                    ))}
                  </List>
                  
                  {attendanceData.length > 10 && (
                    <Typography 
                      sx={{ 
                        mt: 2, 
                        textAlign: 'center', 
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}
                    >
                      Showing most recent 10 of {attendanceData.length} events
                    </Typography>
                  )}
                </>
              ) : (
                <Box sx={{ 
                  p: isMobile ? 2 : 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(25, 25, 25, 0.3)',
                  borderRadius: '8px'
                }}>
                  <Typography 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    Attendance tracking coming soon!
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Gear Check Tab */}
            <Box sx={{ display: currentTab === 3 ? 'block' : 'none' }}>
              {/* User side - upload gear check */}
              {member.id === user?.id && (
                <Box sx={{ mb: isMobile ? 2 : 3 }}>
                  {gearCheckStatus === 'none' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(25, 25, 25, 0.4)', 
                      borderRadius: '8px' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#90caf9', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        No Gear Check Requested
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 2,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        Guild officers haven't requested a gear check from you yet.
                      </Typography>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'requested' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(255, 183, 77, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 183, 77, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#ffb74d', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Requested
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 3,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        Please upload a screenshot of your character sheet showing your gear and stats.
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                          id="gear-check-upload"
                        />
                        <label htmlFor="gear-check-upload">
                          <Button
                            variant="contained"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            sx={{ 
                              mr: 2,
                              py: isMobile ? 0.75 : 1,
                              fontSize: isMobile ? '0.875rem' : '0.9375rem'
                            }}
                          >
                            Select Image
                          </Button>
                        </label>
                        {uploadedFile && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'white', 
                              display: 'inline',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              wordBreak: 'break-word'
                            }}
                          >
                            {uploadedFile.name}
                          </Typography>
                        )}
                      </Box>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={uploadGearCheck}
                        disabled={!uploadedFile}
                        fullWidth={isMobile}
                        sx={{
                          py: isMobile ? 0.75 : 1,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}
                      >
                        Submit Gear Check
                      </Button>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'pending' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(255, 183, 77, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 183, 77, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#ffb74d', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Pending Review
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white',
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        Your gear check has been submitted and is awaiting review by a guild officer.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: isMobile ? '200px' : '300px', 
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }} 
                          />
                        </Box>
                      )}
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'approved' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(102, 255, 102, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(102, 255, 102, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#66ff66', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Approved
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white',
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        Your gear check has been reviewed and approved by a guild officer.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: isMobile ? '200px' : '300px', 
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }} 
                          />
                        </Box>
                      )}
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'denied' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(255, 102, 102, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 102, 102, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#ff6666', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Denied
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 2,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        Please re-submit your gear check. It has been denied for the following reason(s):
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: '#ff6666', 
                          mb: 3, 
                          fontStyle: 'italic',
                          fontSize: isMobile ? '0.875rem' : '1rem',
                          wordBreak: 'break-word'
                        }}
                      >
                        "{gearCheckDenialReason}"
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                          id="gear-check-upload"
                        />
                        <label htmlFor="gear-check-upload">
                          <Button
                            variant="contained"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            sx={{ 
                              mr: 2,
                              py: isMobile ? 0.75 : 1,
                              fontSize: isMobile ? '0.875rem' : '0.9375rem'
                            }}
                          >
                            Select New Image
                          </Button>
                        </label>
                        {uploadedFile && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'white', 
                              display: 'inline',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              wordBreak: 'break-word'
                            }}
                          >
                            {uploadedFile.name}
                          </Typography>
                        )}
                      </Box>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={uploadGearCheck}
                        disabled={!uploadedFile}
                        fullWidth={isMobile}
                        sx={{
                          py: isMobile ? 0.75 : 1,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}
                      >
                        Re-submit Gear Check
                      </Button>
                    </Paper>
                  )}
                </Box>
              )}
              
              {/* Admin side - request, approve/deny gear check */}
              {canAdminGearCheck() && member.id !== user?.id && (
                <Box>
                  {gearCheckStatus === 'none' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(25, 25, 25, 0.4)', 
                      borderRadius: '8px' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#90caf9', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        No Gear Check Requested
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 2,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        No gear check has been requested from this member.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={requestGearCheck}
                        fullWidth={isMobile}
                        sx={{
                          py: isMobile ? 0.75 : 1,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}
                      >
                        Request Gear Check
                      </Button>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'requested' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(255, 183, 77, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 183, 77, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#ffb74d', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Requested
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white',
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        A gear check has been requested from this member. Waiting for their submission.
                      </Typography>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'pending' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(255, 183, 77, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 183, 77, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#ffb74d', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Pending Review
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 2,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        This member has submitted a gear check that needs review.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, mb: 3, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: isMobile ? '200px' : '300px', 
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }} 
                          />
                        </Box>
                      )}
                      
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        flexDirection: isMobile ? 'column' : 'row'
                      }}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={approveGearCheck}
                          sx={{ 
                            color: 'white',
                            py: isMobile ? 0.75 : 1,
                            fontSize: isMobile ? '0.875rem' : '0.9375rem'
                          }}
                          fullWidth={isMobile}
                        >
                          Approve
                        </Button>
                        
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => setDenialDialog(true)}
                          sx={{
                            py: isMobile ? 0.75 : 1,
                            fontSize: isMobile ? '0.875rem' : '0.9375rem'
                          }}
                          fullWidth={isMobile}
                        >
                          Deny
                        </Button>
                      </Box>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'approved' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(102, 255, 102, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(102, 255, 102, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#66ff66', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Approved
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 2,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        This member's gear check has been approved.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: isMobile ? '200px' : '300px', 
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }} 
                          />
                        </Box>
                      )}
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'denied' && (
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      bgcolor: 'rgba(255, 102, 102, 0.1)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 102, 102, 0.3)' 
                    }}>
                      <Typography 
                        variant={isMobile ? "subtitle1" : "h6"} 
                        sx={{ 
                          color: '#ff6666', 
                          mb: 2,
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Gear Check Denied
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white', 
                          mb: 2,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        This member's gear check was denied with the following reason:
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: '#ff6666', 
                          mb: 3, 
                          fontStyle: 'italic',
                          fontSize: isMobile ? '0.875rem' : '1rem',
                          wordBreak: 'break-word'
                        }}
                      >
                        "{gearCheckDenialReason}"
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'white',
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        Waiting for the member to re-submit their gear check.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          </>
        )}
        
        {error && (
          <Typography 
            sx={{ 
              color: '#ff6666', 
              mt: 2, 
              textAlign: 'center',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      {/* Denial reason dialog */}
      <Dialog 
        open={denialDialog} 
        onClose={() => setDenialDialog(false)}
        PaperProps={{
          sx: {
            margin: isMobile ? '16px' : null,
            width: isMobile ? 'calc(100% - 32px)' : null
          }
        }}
      >
        <DialogTitle
          sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}
        >
          Provide Reason for Denial
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Denial"
            fullWidth
            multiline
            rows={4}
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{
          p: isMobile ? 2 : '8px 24px 24px',
          flexDirection: isMobile ? 'column' : 'row',
          '& > :not(:first-of-type)': {
            mt: isMobile ? 1 : 0
          }
        }}>
          <Button 
            onClick={() => setDenialDialog(false)}
            fullWidth={isMobile}
            sx={{ py: isMobile ? 0.75 : undefined }}
          >
            Cancel
          </Button>
          <Button 
            onClick={denyGearCheck} 
            color="error"
            disabled={!denialReason.trim()}
            fullWidth={isMobile}
            sx={{ py: isMobile ? 0.75 : undefined }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Name edit dialog */}
      <NameEditDialog
        open={nameEditOpen}
        onClose={() => setNameEditOpen(false)}
        member={member}
        onSave={handleNameChange}
      />
    </Dialog>
  );
};

export default MemberProfileModal;