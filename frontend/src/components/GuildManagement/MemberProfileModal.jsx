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
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import BuildIcon from '@mui/icons-material/Build';
import ListAltIcon from '@mui/icons-material/ListAlt';
import axiosInstance from '../../config/axios';

const MemberProfileModal = ({ member, open, onClose }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && member) {
      loadMemberData();
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

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
          // Simpler box-shadow that doesn't rely heavily on hardware acceleration
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
      </Tabs>
      
      <DialogContent sx={{ 
        p: 3, 
        backgroundColor: 'rgba(30, 30, 30, 0.4)',
        height: '500px',
        overflowY: 'auto'
      }}>
        {loading ? (
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
          </>
        )}
        
        {error && (
          <Typography sx={{ color: '#ff6666', mt: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MemberProfileModal;