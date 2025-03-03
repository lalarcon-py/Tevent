// src/components/GuildManagement/MemberProfileModal.jsx
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
  DialogActions
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import BuildIcon from '@mui/icons-material/Build';
import ListAltIcon from '@mui/icons-material/ListAlt';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axiosInstance from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';

const MemberProfileModal = ({ member, open, onClose }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
      // Load wishlist items
      const wishlistResponse = await axiosInstance.get(`/api/wishlist/user/${member.id}`);
      setWishlistItems(wishlistResponse.data || []);
      
      // Load attendance history
      const attendanceResponse = await axiosInstance.get(`/api/events/attendance/${member.id}`);
      setAttendanceData(attendanceResponse.data || []);
    } catch (error) {
      console.error('Failed to load member data:', error);
      setError('Could not load all member information');
    } finally {
      setLoading(false);
    }
  };

  const fetchGearCheckStatus = async () => {
    if (!member) return;
    
    try {
      const response = await axiosInstance.get(`/api/gear-check/${member.id}/status`);
      if (response.data) {
        setGearCheckStatus(response.data.status || 'none');
        setGearCheckImage(response.data.imageUrl || null);
        setGearCheckDenialReason(response.data.reason || '');
      }
    } catch (error) {
      console.error('Failed to fetch gear check status:', error);
      // Don't set error as this is supplementary info
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
      await axiosInstance.post(`/api/gear-check/request`, {
        userId: member.id
      });
      setGearCheckStatus('requested');
      fetchGearCheckStatus();
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
      const formData = new FormData();
      formData.append('image', uploadedFile);
      formData.append('userId', member.id);
      
      const response = await axiosInstance.post(`/api/gear-check/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setGearCheckStatus('pending');
      setGearCheckImage(response.data.imageUrl);
      setUploadedFile(null);
    } catch (error) {
      console.error('Failed to upload gear check:', error);
    }
  };

  const approveGearCheck = async () => {
    try {
      await axiosInstance.post(`/api/gear-check/${member.id}/approve`);
      setGearCheckStatus('approved');
    } catch (error) {
      console.error('Failed to approve gear check:', error);
    }
  };

  const denyGearCheck = async () => {
    if (!denialReason.trim()) return;
    
    try {
      await axiosInstance.post(`/api/gear-check/${member.id}/deny`, {
        reason: denialReason
      });
      setGearCheckStatus('denied');
      setGearCheckDenialReason(denialReason);
      setDenialReason('');
      setDenialDialog(false);
    } catch (error) {
      console.error('Failed to deny gear check:', error);
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
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'rgba(25, 25, 25, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={member.avatar_url}
            sx={{ 
              width: 48, 
              height: 48,
              border: '2px solid #90caf9'
            }}
          >
            {member.username?.[0] || '?'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: 'white' }}>
              {member.username}
            </Typography>
            <Typography variant="body2" sx={{ color: '#90caf9' }}>
              {member.role}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          backgroundColor: 'rgba(20, 20, 20, 0.6)',
          '& .MuiTab-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-selected': { color: '#90caf9' }
          },
          '& .MuiTabs-indicator': { backgroundColor: '#90caf9' }
        }}
      >
        <Tab 
          icon={<BuildIcon />} 
          label="Builds" 
          iconPosition="start"
        />
        <Tab 
          icon={<ListAltIcon />} 
          label="Wishlist" 
          iconPosition="start"
        />
        <Tab 
          icon={<EventIcon />} 
          label="Attendance" 
          iconPosition="start"
        />
        <Tab 
          icon={<VerifiedUserIcon />} 
          label="Gear Check" 
          iconPosition="start"
        />
      </Tabs>
      
      <DialogContent sx={{ 
        p: 3, 
        backgroundColor: 'rgba(30, 30, 30, 0.4)',
        height: '500px',
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
                <Grid container spacing={3}>
                  {member.builds.map((build, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Paper sx={{ 
                        p: 2, 
                        backgroundColor: 'rgba(25, 25, 25, 0.6)',
                        border: '1px solid rgba(144, 202, 249, 0.2)',
                        borderRadius: '8px'
                      }}>
                        <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
                          {getWeaponSpec(build.primary, build.secondary)}
                        </Typography>
                        
                        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <img 
                              src={getWeaponIcon(build.primary)} 
                              alt={build.primary}
                              style={{ width: 36, height: 36 }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                            <Typography sx={{ color: 'white' }}>
                              {build.primary}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <img 
                              src={getWeaponIcon(build.secondary)} 
                              alt={build.secondary}
                              style={{ width: 36, height: 36 }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                            <Typography sx={{ color: 'white' }}>
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
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        
                        {member.combat_power && (
                          <Typography sx={{ textAlign: 'center', color: '#ffd700', mt: 2 }}>
                            Combat Power: {member.combat_power}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(25, 25, 25, 0.3)',
                  borderRadius: '8px'
                }}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
                  borderRadius: '8px'
                }}>
                  {wishlistItems.map((item) => (
                    <ListItem 
                      key={item.id}
                      sx={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={item.Item?.icon}
                          sx={{ 
                            bgcolor: 'rgba(144, 202, 249, 0.1)',
                            border: '1px solid rgba(144, 202, 249, 0.2)'
                          }}
                        >
                          {item.Item?.name?.[0] || item.item_name?.[0] || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography sx={{ color: 'white' }}>
                            {item.Item?.name || item.item_name}
                            {item.priority > 0 && (
                              <Chip 
                                label={`${item.priority} DKP`} 
                                size="small"
                                sx={{ 
                                  ml: 1, 
                                  bgcolor: 'rgba(255, 215, 0, 0.2)',
                                  color: '#ffd700'
                                }}
                              />
                            )}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {item.Item?.type || item.item_type || 'Unknown'}
                            {item.notes && ` - ${item.notes}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(25, 25, 25, 0.3)',
                  borderRadius: '8px'
                }}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    No wishlist items found
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Attendance Tab */}
            <Box sx={{ display: currentTab === 2 ? 'block' : 'none' }}>
              {attendanceData.length > 0 ? (
                <>
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(144, 202, 249, 0.1)', borderRadius: '8px' }}>
                    <Typography variant="h6" sx={{ color: '#90caf9', mb: 1 }}>
                      Attendance Summary
                    </Typography>
                    <Typography sx={{ color: 'white' }}>
                      Total Events: {attendanceData.length}
                    </Typography>
                    <Typography sx={{ color: 'white' }}>
                      Attendance Rate: {Math.round(attendanceData.filter(a => a.attended).length / attendanceData.length * 100)}%
                    </Typography>
                  </Box>
                
                  <List sx={{ 
                    backgroundColor: 'rgba(25, 25, 25, 0.4)', 
                    borderRadius: '8px'
                  }}>
                    {attendanceData.slice(0, 10).map((attendance) => (
                      <ListItem 
                        key={attendance.id}
                        sx={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          '&:last-child': { borderBottom: 'none' }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: attendance.attended ? 'rgba(102, 255, 102, 0.2)' : 'rgba(255, 102, 102, 0.2)',
                              color: attendance.attended ? '#66ff66' : '#ff6666'
                            }}
                          >
                            {attendance.attended ? '✓' : '✗'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography sx={{ color: 'white' }}>
                              {attendance.event?.title || 'Unknown Event'}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {new Date(attendance.event?.event_time || attendance.date).toLocaleString()}
                            </Typography>
                          }
                        />
                        {attendance.attended && attendance.dkp_earned > 0 && (
                          <Chip 
                            label={`+${attendance.dkp_earned} DKP`} 
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(255, 215, 0, 0.2)',
                              color: '#ffd700'
                            }}
                          />
                        )}
                      </ListItem>
                    ))}
                  </List>
                  
                  {attendanceData.length > 10 && (
                    <Typography sx={{ mt: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Showing most recent 10 of {attendanceData.length} events
                    </Typography>
                  )}
                </>
              ) : (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(25, 25, 25, 0.3)',
                  borderRadius: '8px'
                }}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    No attendance history found
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Gear Check Tab */}
            <Box sx={{ display: currentTab === 3 ? 'block' : 'none' }}>
              {/* User side - upload gear check */}
              {member.id === user?.id && (
                <Box sx={{ mb: 3 }}>
                  {gearCheckStatus === 'none' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(25, 25, 25, 0.4)', borderRadius: '8px' }}>
                      <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
                        No Gear Check Requested
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 2 }}>
                        Guild officers haven't requested a gear check from you yet.
                      </Typography>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'requested' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255, 183, 77, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 183, 77, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#ffb74d', mb: 2 }}>
                        Gear Check Requested
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 3 }}>
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
                            sx={{ mr: 2 }}
                          >
                            Select Image
                          </Button>
                        </label>
                        {uploadedFile && (
                          <Typography variant="body2" sx={{ color: 'white', display: 'inline' }}>
                            {uploadedFile.name}
                          </Typography>
                        )}
                      </Box>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={uploadGearCheck}
                        disabled={!uploadedFile}
                      >
                        Submit Gear Check
                      </Button>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'pending' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255, 183, 77, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 183, 77, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#ffb74d', mb: 2 }}>
                        Gear Check Pending Review
                      </Typography>
                      <Typography sx={{ color: 'white' }}>
                        Your gear check has been submitted and is awaiting review by a guild officer.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }} 
                          />
                        </Box>
                      )}
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'approved' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(102, 255, 102, 0.1)', borderRadius: '8px', border: '1px solid rgba(102, 255, 102, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#66ff66', mb: 2 }}>
                        Gear Check Approved
                      </Typography>
                      <Typography sx={{ color: 'white' }}>
                        Your gear check has been reviewed and approved by a guild officer.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }} 
                          />
                        </Box>
                      )}
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'denied' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255, 102, 102, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 102, 102, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#ff6666', mb: 2 }}>
                        Gear Check Denied
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 2 }}>
                        Please re-submit your gear check. It has been denied for the following reason(s):
                      </Typography>
                      <Typography sx={{ color: '#ff6666', mb: 3, fontStyle: 'italic' }}>
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
                            sx={{ mr: 2 }}
                          >
                            Select New Image
                          </Button>
                        </label>
                        {uploadedFile && (
                          <Typography variant="body2" sx={{ color: 'white', display: 'inline' }}>
                            {uploadedFile.name}
                          </Typography>
                        )}
                      </Box>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={uploadGearCheck}
                        disabled={!uploadedFile}
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
                    <Paper sx={{ p: 3, bgcolor: 'rgba(25, 25, 25, 0.4)', borderRadius: '8px' }}>
                      <Typography variant="h6" sx={{ color: '#90caf9', mb: 2 }}>
                        No Gear Check Requested
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 2 }}>
                        No gear check has been requested from this member.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={requestGearCheck}
                      >
                        Request Gear Check
                      </Button>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'requested' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255, 183, 77, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 183, 77, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#ffb74d', mb: 2 }}>
                        Gear Check Requested
                      </Typography>
                      <Typography sx={{ color: 'white' }}>
                        A gear check has been requested from this member. Waiting for their submission.
                      </Typography>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'pending' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255, 183, 77, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 183, 77, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#ffb74d', mb: 2 }}>
                        Gear Check Pending Review
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 2 }}>
                        This member has submitted a gear check that needs review.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, mb: 3, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }} 
                          />
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={approveGearCheck}
                          sx={{ color: 'white' }}
                        >
                          Approve
                        </Button>
                        
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => setDenialDialog(true)}
                        >
                          Deny
                        </Button>
                      </Box>
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'approved' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(102, 255, 102, 0.1)', borderRadius: '8px', border: '1px solid rgba(102, 255, 102, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#66ff66', mb: 2 }}>
                        Gear Check Approved
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 2 }}>
                        This member's gear check has been approved.
                      </Typography>
                      
                      {gearCheckImage && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img 
                            src={gearCheckImage} 
                            alt="Gear Check" 
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }} 
                          />
                        </Box>
                      )}
                    </Paper>
                  )}
                  
                  {gearCheckStatus === 'denied' && (
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255, 102, 102, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 102, 102, 0.3)' }}>
                      <Typography variant="h6" sx={{ color: '#ff6666', mb: 2 }}>
                        Gear Check Denied
                      </Typography>
                      <Typography sx={{ color: 'white', mb: 2 }}>
                        This member's gear check was denied with the following reason:
                      </Typography>
                      <Typography sx={{ color: '#ff6666', mb: 3, fontStyle: 'italic' }}>
                        "{gearCheckDenialReason}"
                      </Typography>
                      <Typography sx={{ color: 'white' }}>
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
          <Typography sx={{ color: '#ff6666', mt: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      {/* Denial reason dialog */}
      <Dialog open={denialDialog} onClose={() => setDenialDialog(false)}>
        <DialogTitle>Provide Reason for Denial</DialogTitle>
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
        <DialogActions>
          <Button onClick={() => setDenialDialog(false)}>Cancel</Button>
          <Button 
            onClick={denyGearCheck} 
            color="error"
            disabled={!denialReason.trim()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default MemberProfileModal;