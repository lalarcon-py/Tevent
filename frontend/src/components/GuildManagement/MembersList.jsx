import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, 
  Button, Avatar, Typography, Box, TextField, useMediaQuery, useTheme, Chip,
  SwipeableDrawer, List, ListItem, ListItemText, ListItemAvatar, Divider,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { useAuth } from '../../contexts/AuthContext';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext'; // Added import
import MemberProfileModal from './MemberProfileModal';
import axiosInstance from '../../config/axios';


const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : process.env.REACT_APP_API_URL;

// Weapon Logic (Items Icons, CP, Etc..)
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

const GUILD_ROLES = {
  'Guild Master': 4,
  'Guild Advisor': 3,
  'Guild Guardian': 2,
  'Guild Member': 1
};

const getWeaponSpec = (primary, secondary) => {
  const combo1 = `${primary}|${secondary}`;
  const combo2 = `${secondary}|${primary}`;
  return WEAPON_SPECS[combo1] || WEAPON_SPECS[combo2] || 'Unknown Spec';
};

const getWeaponIcon = (weaponName) => {
  if (!weaponName) return null;
  const formattedName = weaponName.replace(/\s+/g, ' ').trim();
  return `${process.env.PUBLIC_URL}/weapons/${formattedName} Art.png`;
};

const RoleManagementDialog = ({ member, currentUserRole, currentUser, onClose, onSave }) => {
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [username, setUsername] = useState(member.username);
  const [error, setError] = useState(null);
  const { simulatedRole } = useSimulatedRole(); // Get simulated role
  
  // Use effective role (simulated or actual)
  const effectiveRole = simulatedRole || currentUserRole;
  
  // Add a flag to check if this is a guild master transfer
  const isGuildMasterTransfer = selectedRole === 'Guild Master';

  // First useEffect - check for Guild Master permission
  useEffect(() => {
    // Close the dialog if not Guild Master
    if (effectiveRole !== 'Guild Master') {
      onClose();
    }
  }, [effectiveRole, onClose]);

  // Update state when member changes
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
      setUsername(member.username);
    }
  }, [member]);

  useEffect(() => {
    // If trying to edit someone else's profile and not an admin, close the dialog
    if (member && currentUser && member.id !== currentUser.id && 
       !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole)) {
      onClose();
    }
  }, [member, currentUser, effectiveRole, onClose]);

  

  const handleRoleChange = async (newRole) => {
    setError(null);

    if (newRole === 'Guild Master') {
      setConfirmTransfer(true);
      return;
    }

    if (newRole === 'Guild Guardian') {
      try {
        const guardianCount = await fetch(`${API_URL}/api/members/count-guardians`, {
          credentials: 'include'
        }).then(res => res.json());
        
        if (guardianCount >= 5 && member.role !== 'Guild Guardian') {
          setError('Maximum of 5 Guild Guardians allowed');
          return;
        }
      } catch (error) {
        console.error('Failed to check guardian count:', error);
      }
    }

    setSelectedRole(newRole);
  };

  // Make sure all possible role options are included
  const GUILD_ROLES = {
    'Guild Master': 4,
    'Guild Advisor': 3,
    'Guild Guardian': 2,
    'Member': 1,  // Added this to fix missing role
    'Guild Member': 1  // Some systems use this name
  };

  const getAvailableRoles = () => {
    if (effectiveRole !== 'Guild Master') {
      return [];
    }
    
    // Return all roles including Guild Master
    return Object.keys(GUILD_ROLES).filter(role => {
      // Filter out redundant Member/Guild Member entries
      if ((role === 'Member' && GUILD_ROLES['Guild Member']) || 
          (role === 'Guild Member' && GUILD_ROLES['Member'] && role !== member.role)) {
        return false;
      }
      
      return true; // Show all roles including Guild Master
    });
  };

  return (
    <>
      <Dialog 
        open={!confirmTransfer} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        {effectiveRole === 'Guild Master' ? (
          <>
            <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
              Manage {member.username}'s Profile
            </DialogTitle>
            <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
              {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                  {error}
                </Typography>
              )}
              <Box sx={{ mb: 2 }}>
                <Typography color="white" sx={{ mb: 1 }}>Role</Typography>
                <Select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  fullWidth
                  sx={{ 
                    bgcolor: '#2d2d2d',
                    color: 'white',
                    '& .MuiSelect-icon': { color: 'white' }
                  }}
                >
                  {getAvailableRoles().map((role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Button 
                variant="contained"
                onClick={() => onSave({ 
                  ...member, 
                  role: selectedRole,
                })}
                sx={{ 
                  bgcolor: '#90caf9',
                  '&:hover': { bgcolor: '#64b5f6' }
                }}
              >
                Save Changes
              </Button>
            </DialogContent>
          </>
        ) : (
          <>
            <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
              Permission Denied
            </DialogTitle>
            <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
              <Typography color="error">
                Only Guild Masters can manage member roles.
              </Typography>
              <Button 
                onClick={onClose} 
                variant="contained" 
                sx={{ 
                  mt: 2, 
                  bgcolor: '#90caf9',
                  '&:hover': { bgcolor: '#64b5f6' }
                }}
              >
                Close
              </Button>
            </DialogContent>
          </>
        )}
      </Dialog>
  
      <Dialog
        open={confirmTransfer && effectiveRole === 'Guild Master'}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#1a1a1a', 
          color: 'red',
          fontSize: '24px',
          textAlign: 'center'
        }}>
          ⚠️ WARNING: Guild Master Transfer ⚠️
        </DialogTitle>
        <DialogContent sx={{ 
          bgcolor: '#1e1e1e', 
          pt: 2,
          textAlign: 'center' 
        }}>
          <Typography color="white" variant="h6" sx={{ mb: 3 }}>
            You are about to transfer Guild Master status to:
          </Typography>
          <Typography color="#90caf9" variant="h5" sx={{ mb: 4 }}>
            {member.username}
          </Typography>
          <Typography color="white" sx={{ mb: 4 }}>
            This action is irreversible. You will lose all Guild Master privileges.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained"
              color="error"
              onClick={() => setConfirmTransfer(false)}
              sx={{ minWidth: 120 }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              color="warning"
              onClick={() => {
                onSave({ ...member, role: 'Guild Master' });
                setConfirmTransfer(false);
              }}
              sx={{ minWidth: 120 }}
            >
              Confirm Transfer
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Edit button functions

const EditMemberDialog = ({ member, currentUser, onClose, onSave }) => {
  const { simulatedRole } = useSimulatedRole(); // Get simulated role
  const [editedMember, setEditedMember] = useState(member ? {
    ...member,
    builds: member.builds || [{
      primary: 'Greatsword',
      secondary: 'Crossbow',
      spec: 'DPS'
    }],
    weapon_spec: member.weapon_spec,
    combat_power: member.combat_power || ''
  } : null);

  const [showCombatPower, setShowCombatPower] = useState(false);

  useEffect(() => {
    if (member) {
      // Use effective role (simulated or actual)
      const effectiveRole = simulatedRole || currentUser?.role;
      
      const isCurrentUser = member.id === currentUser?.id;
      const currentUserHasAdminRole = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
      
      // Only show combat power if it's your own profile OR if you're an admin
      setShowCombatPower(isCurrentUser || currentUserHasAdminRole);
      
      setEditedMember({
        ...member,
        builds: member.builds || [{
          primary: 'Greatsword',
          secondary: 'Crossbow',
          spec: 'DPS'
        }],
        combat_power: member.combat_power || ''
      });
    }
  }, [member, currentUser, simulatedRole]);

  // Add the new permission check
  useEffect(() => {
    // Use effective role (simulated or actual)
    const effectiveRole = simulatedRole || currentUser?.role;
    
    if (member && currentUser && member.id !== currentUser.id && 
        !['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole)) {
      onClose();
    }
  }, [member, currentUser, simulatedRole, onClose]);

  const weapons = [
    'Greatsword', 'Sword and Shield', 'Staff', 'Crossbow',
    'Dagger', 'Wand', 'Bow', 'Spear'
  ];

  const handleAddBuild = () => {
    // Check if there are already 2 builds
    if (editedMember.builds.length >= 2) {
      alert("You can only have a maximum of 2 builds.");
      return;
    }
    
    // Default new build
    const newBuild = { primary: 'Greatsword', secondary: 'Crossbow', spec: 'DPS' };
    
    // Check if this build is unique (prevent duplicates)
    const isDuplicate = editedMember.builds.some(build => 
      (build.primary === newBuild.primary && build.secondary === newBuild.secondary) ||
      (build.primary === newBuild.secondary && build.secondary === newBuild.primary)
    );
    
    if (isDuplicate) {
      alert("This weapon combination already exists. Please choose a different combination.");
      return;
    }
    
    setEditedMember({
      ...editedMember,
      builds: [
        ...editedMember.builds,
        newBuild
      ]
    });
  };

  const handleRemoveBuild = (index) => {
    const updatedBuilds = editedMember.builds.filter((_, i) => i !== index);
    setEditedMember({
      ...editedMember,
      builds: updatedBuilds
    });
  };

  const handlePrimaryWeaponChange = (buildIndex, value) => {
    const updatedBuilds = [...editedMember.builds];
    
    // Check if changing this would create a duplicate
    const isDuplicate = editedMember.builds.some((build, index) => {
      if (index === buildIndex) return false; // Skip current build
      
      return (
        (build.primary === value && build.secondary === updatedBuilds[buildIndex].secondary) ||
        (build.primary === updatedBuilds[buildIndex].secondary && build.secondary === value)
      );
    });
    
    if (isDuplicate) {
      alert("This would create a duplicate build. Please choose a different weapon.");
      return;
    }
    
    updatedBuilds[buildIndex].primary = value;
    setEditedMember({ ...editedMember, builds: updatedBuilds });
  };

  const handleSecondaryWeaponChange = (buildIndex, value) => {
    const updatedBuilds = [...editedMember.builds];
    
    // Check if changing this would create a duplicate
    const isDuplicate = editedMember.builds.some((build, index) => {
      if (index === buildIndex) return false; // Skip current build
      
      return (
        (build.secondary === value && build.primary === updatedBuilds[buildIndex].primary) ||
        (build.secondary === updatedBuilds[buildIndex].primary && build.primary === value)
      );
    });
    
    if (isDuplicate) {
      alert("This would create a duplicate build. Please choose a different weapon.");
      return;
    }
    
    updatedBuilds[buildIndex].secondary = value;
    setEditedMember({ ...editedMember, builds: updatedBuilds });
  };

  const handleSpecChange = (buildIndex, value) => {
    const updatedBuilds = [...editedMember.builds];
    updatedBuilds[buildIndex].spec = value;
    setEditedMember({ ...editedMember, builds: updatedBuilds });
  };

  return (
    <Dialog 
      open={Boolean(member)} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
    >
      {editedMember && (
        <>
          <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
            Edit {editedMember.username}'s Builds
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
            {editedMember?.builds?.map((build, index) => (
              <Box key={index} sx={{ mb: 3, position: 'relative' }}>
                <Typography color="white" variant="h6" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  Build {index + 1}
                  {editedMember.builds.length > 1 && (
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveBuild(index)}
                      sx={{ color: '#ff4444' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography color="white" sx={{ mb: 1 }}>Primary Weapon</Typography>
                  <Select
                    value={build.primary}
                    onChange={(e) => handlePrimaryWeaponChange(index, e.target.value)}
                    fullWidth
                    sx={{ 
                      bgcolor: '#2d2d2d',
                      color: 'white',
                      '& .MuiSelect-icon': { color: 'white' }
                    }}
                  >
                    {weapons.map((weapon) => (
                      <MenuItem key={weapon} value={weapon}>{weapon}</MenuItem>
                    ))}
                  </Select>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography color="white" sx={{ mb: 1 }}>Secondary Weapon</Typography>
                  <Select
                    value={build.secondary}
                    onChange={(e) => handleSecondaryWeaponChange(index, e.target.value)}
                    fullWidth
                    sx={{ 
                      bgcolor: '#2d2d2d',
                      color: 'white',
                      '& .MuiSelect-icon': { color: 'white' }
                    }}
                  >
                    {weapons.map((weapon) => (
                      <MenuItem key={weapon} value={weapon}>{weapon}</MenuItem>
                    ))}
                  </Select>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography color="white" sx={{ mb: 1 }}>Combat Role</Typography>
                  <Select
                    value={build.spec}
                    onChange={(e) => handleSpecChange(index, e.target.value)}
                    fullWidth
                    sx={{ 
                      bgcolor: '#2d2d2d',
                      color: 'white',
                      '& .MuiSelect-icon': { color: 'white' }
                    }}
                  >
                    <MenuItem value="DPS">DPS</MenuItem>
                    <MenuItem value="Tank">Tank</MenuItem>
                    <MenuItem value="Healer">Healer</MenuItem>
                  </Select>
                </Box>
              </Box>
            ))}

          <TextField
            label="Combat Power"
            type="number"
            value={editedMember.combat_power || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                setEditedMember({
                  ...editedMember,
                  combat_power: ''
                });
              } else {
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 6300) {
                  setEditedMember({
                    ...editedMember,
                    combat_power: numValue
                  });
                }
              }
            }}
            inputProps={{ min: 0, max: 6300 }}
            fullWidth
            sx={{ 
              bgcolor: '#2d2d2d',
              input: { color: 'white' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&.Mui-focused fieldset': { borderColor: '#90caf9' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' } // Added styling for the label
            }}
          />


            <Button 
              variant="contained" 
              onClick={handleAddBuild}
              sx={{ 
                mr: 1,
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              Add Build
            </Button>

            <Button 
              variant="contained" 
              onClick={() => onSave(editedMember)} 
              sx={{ 
                bgcolor: '#90caf9',
                '&:hover': { bgcolor: '#64b5f6' }
              }}
            >
              Save
            </Button>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

const NameEditDialog = ({ open, onClose, member, onSave }) => {
  const [newName, setNewName] = useState(member?.username || '');
  
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
    >
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
        Edit Your Username
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2, pb: 2 }}>
        <TextField
          fullWidth
          label="New Username"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          margin="dense"
          sx={{ 
            bgcolor: '#2d2d2d',
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
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
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


const MembersList = ({ searchTerm, members, setMembers, currentUser: propCurrentUser }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { user: authCurrentUser } = useAuth();
  const { simulatedRole } = useSimulatedRole(); // Get simulated role
  const [roleManagementMember, setRoleManagementMember] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nameEditMember, setNameEditMember] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [mobileDetailDrawer, setMobileDetailDrawer] = useState(false);
  const [activeMobileMember, setActiveMobileMember] = useState(null);
  const [kickMemberConfirm, setKickMemberConfirm] = useState(null);
  
  const effectiveCurrentUser = propCurrentUser || authCurrentUser;

  // Helper functions for permission checks - ADDED/FIXED
  const canEditProfile = (member) => {
    // Get effective role (simulated or real)
    const effectiveRole = simulatedRole || effectiveCurrentUser?.role;
    
    // Any user can edit their own profile
    const isOwnProfile = member.id === effectiveCurrentUser?.id;
    // Admins can edit any profile
    const hasAdminRole = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
    
    // For debugging
    if (simulatedRole) {
      console.log('Role simulation active:', {
        simulatedRole,
        actualRole: effectiveCurrentUser?.role,
        isOwnProfile,
        hasAdminPrivileges: hasAdminRole
      });
    }
    
    return isOwnProfile || hasAdminRole;
  };

  const canEditName = (member) => {
    // Get effective role (simulated or real)
    const effectiveRole = simulatedRole || effectiveCurrentUser?.role;
    
    // Any user can edit their own name
    const isOwnProfile = member.id === effectiveCurrentUser?.id;
    // Only Guild Masters can edit other people's names
    const isGuildMaster = effectiveRole === 'Guild Master';
    
    return isOwnProfile || isGuildMaster;
  };

  const canManageRoles = () => {
    // Get effective role (simulated or real)
    const effectiveRole = simulatedRole || effectiveCurrentUser?.role;
    
    return effectiveRole === 'Guild Master';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleKickMember = async () => {
    try {
      console.log("Starting member removal process...");
      
      if (!kickMemberConfirm) {
        console.error("No member selected for removal");
        return;
      }
      
      const memberToRemove = kickMemberConfirm;
      console.log(`Attempting to remove member: ${memberToRemove.username} (ID: ${memberToRemove.id})`);
      
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found in localStorage');
        alert("Error: Guild ID not found. Please refresh the page and try again.");
        return;
      }
      
      // Store current members for comparison later
      const currentMembers = [...members];
      
      // Immediately update the UI (optimistic update)
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberToRemove.id));
      
      // Close the dialog
      setKickMemberConfirm(null);
      
      // Make the DELETE request
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/members/${memberToRemove.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        // Revert UI if request failed
        setMembers(currentMembers);
        alert(`Error: Failed to remove member (status ${response.status})`);
        return;
      }
      
      // Try to parse response
      let responseData;
      try {
        responseData = await response.json();
        console.log("Response data:", responseData);
      } catch (jsonError) {
        console.log("No JSON response or invalid JSON");
      }
      
      // Check if the member is still in the response data (which means delete failed)
      if (Array.isArray(responseData)) {
        const memberStillExists = responseData.some(m => m.id === memberToRemove.id);
        
        if (memberStillExists) {
          console.log("Member still exists in response - making direct database request");
          
          // Try direct database DELETE as a fallback
          const directDeleteResponse = await fetch(`${API_URL}/api/direct-member-delete`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guildId,
              memberId: memberToRemove.id,
              forceDirect: true  // Signal to backend this is a direct operation
            })
          });
          
          if (!directDeleteResponse.ok) {
            console.error("Direct delete also failed");
            setMembers(responseData); // Use the server's current state
            alert("Could not remove member. Please try again later.");
            return;
          }
        }
      }
      
      // Success - keep our optimistic update
      alert(`${memberToRemove.username} has been removed from the guild.`);
      
    } catch (error) {
      console.error('Error removing member:', error);
      // Refresh member list to ensure UI matches server state
      fetchMembers();
      alert(`Error: ${error.message || "Failed to remove member"}`);
    }
  };

  useEffect(() => {
    if (roleManagementMember && !canManageRoles()) {
      setRoleManagementMember(null);
    }
  }, [roleManagementMember]);

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        const data = await response.json();
        setCurrentUserRole(data.role);
      } catch (error) {
        console.error('Error fetching current user role:', error);
      }
    };
    fetchCurrentUserRole();
  }, []);
  
  const handleRoleSave = async (updatedMember) => {
    try {
      if (!canManageRoles()) {
        console.error('Permission denied: Only Guild Masters can change roles');
        setError('Permission denied: Only Guild Masters can change roles');
        return;
      }
      
      const guildId = localStorage.getItem('guildId');
      
      const isGuildMasterTransfer = updatedMember.role === 'Guild Master';
      const endpoint = isGuildMasterTransfer 
        ? `${API_URL}/api/guilds/transfer-master`
        : `${API_URL}/api/members/${updatedMember.id}?guildId=${guildId}`;
      
      // Get the member's full data to ensure we have all needed fields
      let memberData = members.find(m => m.id === updatedMember.id) || updatedMember;
      
      // For Guild Master transfer, use specific payload
      const payload = isGuildMasterTransfer 
        ? { 
            guildId, 
            newMasterId: updatedMember.id 
          }
        : {
            id: updatedMember.id,
            guildId,
            role: updatedMember.role,
            username: updatedMember.username || memberData.username,
            // Include all required fields with proper fallbacks
            discord_id: memberData.discord_id || memberData.discordId || '',
            status: memberData.status || 'Active',
            avatar_url: memberData.avatar_url || memberData.avatarUrl || '',
            avatarUrl: memberData.avatar_url || memberData.avatarUrl || '',
            combat_power: memberData.combat_power || 0,
            builds: memberData.builds || []
          };
      
      console.log('Sending role update payload:', payload);
  
      const response = await fetch(endpoint, {
        method: isGuildMasterTransfer ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update member');
      }
  
      await fetchMembers();
      setRoleManagementMember(null);
  
      if (isGuildMasterTransfer) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error.message || 'Failed to update member');
    }
  };

  const handleNameChange = async (newName) => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      // Check if user has permission to edit this name
      if (!canEditName(nameEditMember)) {
        alert('You do not have permission to edit this name');
        setNameEditMember(null);
        return;
      }
      
      const response = await axiosInstance.put(`/api/guilds/members/${nameEditMember.id}/update-name`, {
        username: newName,
        guildId
      });
      
      // Update the local state
      setMembers(prevMembers => 
        prevMembers.map(member => {
          if (member.id === nameEditMember.id) {
            return {
              ...member,
              username: newName
            };
          }
          return member;
        })
      );
      
      // Close the dialog
      setNameEditMember(null);
      
    } catch (error) {
      console.error('Error updating username:', error);
      alert(`Failed to update username: ${error.response?.data?.error || error.message}`);
    }
  };
  
  const getSortedMembers = (membersToSort) => {
    if (!sortConfig.key) return membersToSort;
  
    return [...membersToSort].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
  
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
  
      // Special handling for combat_power
      if (sortConfig.key === 'combat_power') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
  
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
  
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Mobile touch-friendly drawer for member details
  const handleMemberTap = (member) => {
    if (isMobile) {
      setActiveMobileMember(member);
      setMobileDetailDrawer(true);
    } else {
      setSelectedMember(member);
    }
  };

  const fetchMembers = async () => {
    try {
      const guildId = localStorage.getItem('guildId');
      
      if (!guildId) {
        console.error('No guild ID found');
        setLoading(false);
        return;
      }
  
      console.log('Fetching members for guild:', guildId);
      
      // Add cache-busting parameter and headers
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/members?timestamp=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch members');
      }
      
      const data = await response.json();
      console.log('Members data received:', data);
      
      // Process member data to ensure builds are in the right format
      const processedData = data.map(member => ({
        ...member,
        builds: Array.isArray(member.builds) ? member.builds : 
                typeof member.builds === 'string' ? JSON.parse(member.builds) : []
      }));
      
      setMembers(processedData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSave = async (updatedMember) => {
    try {
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
      // FIXED: Add permission check before saving
      if (!canEditProfile(updatedMember)) {
        console.error('Permission denied: Cannot edit this profile');
        return;
      }
      
      const weaponSpec = getWeaponSpec(
        updatedMember.builds[0].primary, 
        updatedMember.builds[0].secondary
      );
  
      const memberToUpdate = {
        ...updatedMember,
        guildId,
        weapon_spec: weaponSpec, // This might be needed for backward compatibility
        combat_power: updatedMember.combat_power,
        builds: updatedMember.builds.map(build => {
          // Calculate weapon_spec for EACH build
          const buildWeaponSpec = getWeaponSpec(build.primary, build.secondary);
          return {
            primary: build.primary,
            secondary: build.secondary,
            spec: build.spec,
            weapon_spec: buildWeaponSpec
          };
        })
      };
  
      console.log('Sending update data:', JSON.stringify(memberToUpdate, null, 2));
    
      const response = await fetch(`${API_URL}/api/members/${memberToUpdate.id}?guildId=${guildId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(memberToUpdate)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(`Failed to update member: ${errorData.error || 'Unknown error'}`);
      }
  
      const responseData = await response.json();
      console.log('Response data from server:', responseData);
  
      setMembers(prevMembers => 
        prevMembers.map(member => {
          if (member.id === responseData.id) {
            // Handle the double-nested array structure
            const builds = Array.isArray(responseData.builds[0]) ? 
              responseData.builds[0] : responseData.builds;
              
            return {
              ...responseData,
              builds: builds,
              weapon_spec: weaponSpec
            };
          }
          return member;
        })
      );
      setEditMember(null);
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  // Render the mobile member list as cards instead of table rows
  const renderMobileList = () => {
    return (
      <List sx={{ width: '100%', bgcolor: '#1e1e1e', p: 0 }}>
        {sortedMembers.map((member, index) => (
          <React.Fragment key={member.id}>
            <ListItem 
              alignItems="flex-start"
              sx={{ 
                py: 2,
                '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
              }}
              onClick={() => handleMemberTap(member)}
            >
              <ListItemAvatar>
                <Avatar 
                  src={member.avatarUrl || member.avatar_url} 
                  alt={member.username}
                  sx={{ 
                    width: 45, 
                    height: 45,
                    border: '2px solid #90caf9',
                    mr: 2
                  }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" color="white" sx={{ fontWeight: 'bold' }}>
                      {member.username}
                    </Typography>
                    {member.role === 'Guild Master' && (
                      <span role="img" aria-label="crown" style={{ fontSize: '14px', color: '#ffd700' }}>👑</span>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="#90caf9" component="span">
                      {member.role}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip 
                        label={member.status || 'Active'} 
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(102, 255, 102, 0.2)',
                          color: '#66ff66',
                          height: 20,
                          fontSize: '0.65rem'
                        }}
                      />
                      {member.combat_power && (
                        <Chip 
                          label={`CP: ${member.combat_power}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255, 215, 0, 0.2)',
                            color: '#ffd700',
                            height: 20,
                            fontSize: '0.65rem'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                }
                sx={{ color: 'white' }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 'auto' }}>
                {/* FIXED: Edit button - always show for own profile */}
                {canEditProfile(member) && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditMember(member);
                    }}
                    sx={{ 
                      color: '#90caf9',
                      padding: '8px',
                      '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.2)' }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                
                {/* Role management button - only for Guild Masters */}
                {canManageRoles() && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoleManagementMember(member);
                    }}
                    sx={{ 
                      color: '#ffd700',
                      padding: '8px',
                      '&:hover': { bgcolor: 'rgba(255, 215, 0, 0.2)' }
                    }}
                  >
                    <span role="img" aria-label="king" style={{ fontSize: '14px' }}>♚</span>
                  </IconButton>
                )}

                {canManageRoles() && member.id !== effectiveCurrentUser.id && member.role !== 'Guild Master' && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setKickMemberConfirm(member);
                    }}
                    sx={{ 
                      color: '#ff4444',
                      padding: '8px',
                      '&:hover': { bgcolor: 'rgba(255, 68, 68, 0.2)' }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </ListItem>
            {index < sortedMembers.length - 1 && <Divider variant="inset" component="li" sx={{ bgcolor: '#333' }} />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  // Mobile drawer for member details
  const renderMobileDrawer = () => {
    if (!activeMobileMember) return null;
    
    const member = activeMobileMember;
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={mobileDetailDrawer}
        onClose={() => setMobileDetailDrawer(false)}
        onOpen={() => setMobileDetailDrawer(true)}
        disableSwipeToOpen
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            bgcolor: '#262626',
            maxHeight: '85vh'
          }
        }}
      >
        <Box sx={{ 
          width: '40px', 
          height: '5px', 
          bgcolor: '#666', 
          borderRadius: '3px', 
          mx: 'auto',
          mt: 1,
          mb: 2
        }} />
        
        <Box sx={{ px: 3, pb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={member.avatarUrl || member.avatar_url}
              alt={member.username}
              sx={{ width: 60, height: 60, border: '2px solid #90caf9', mr: 2 }}
            />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" color="white">
                  {member.username}
                </Typography>
                {canEditName(member) && (
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setMobileDetailDrawer(false);
                      setNameEditMember(member);
                    }}
                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <Typography variant="subtitle2" color="#90caf9">
                {member.role}
              </Typography>
            </Box>
            
            {/* Role management button for Guild Masters */}
            {canManageRoles() && member.id !== effectiveCurrentUser.id && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<span role="img" aria-label="king" style={{ fontSize: '14px' }}>♚</span>}
                onClick={() => {
                  setMobileDetailDrawer(false);
                  setRoleManagementMember(member);
                }}
                sx={{ 
                  ml: 'auto',
                  borderColor: '#ffd700',
                  color: '#ffd700',
                  '&:hover': { borderColor: '#ffd700', bgcolor: 'rgba(255, 215, 0, 0.1)' }
                }}
              >
                Change Role
              </Button>
            )}

            {canManageRoles() && member.id !== effectiveCurrentUser.id && member.role !== 'Guild Master' && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setMobileDetailDrawer(false);
                  setKickMemberConfirm(member);
                }}
                sx={{ 
                  mt: 2,
                  borderColor: '#ff4444',
                  color: '#ff4444',
                  '&:hover': { borderColor: '#ff4444', bgcolor: 'rgba(255, 68, 68, 0.1)' }
                }}
              >
                Remove from Guild
              </Button>
            )}
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="white" gutterBottom>
              Status
            </Typography>
            <Chip 
              label={member.status || 'Active'} 
              sx={{ 
                bgcolor: 'rgba(102, 255, 102, 0.2)',
                color: '#66ff66',
                fontWeight: 'medium'
              }}
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="white" gutterBottom>
              Combat Power
            </Typography>
            <Typography variant="h5" color="#ffd700">
              {member.combat_power || 'N/A'}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="subtitle2" color="white" gutterBottom>
              Builds
            </Typography>
            {member.builds?.map((build, index) => (
              <Box 
                key={index} 
                sx={{ 
                  mb: 2,
                  p: 2,
                  bgcolor: 'rgba(144, 202, 249, 0.1)',
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle2" color="white" gutterBottom>
                  Build {index + 1}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {build.primary && (
                      <img 
                        src={getWeaponIcon(build.primary)} 
                        alt={build.primary}
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <Typography variant="body2" color="white">
                      {build.primary}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="white">+</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {build.secondary && (
                      <img 
                        src={getWeaponIcon(build.secondary)} 
                        alt={build.secondary}
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <Typography variant="body2" color="white">
                      {build.secondary}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="#90caf9">
                    {member.weapon_spec || getWeaponSpec(build.primary, build.secondary)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: build.spec === 'DPS' ? '#ff6666' : 
                             build.spec === 'Tank' ? '#66b3ff' : 
                             '#66ff66'
                    }}
                  >
                    {build.spec}
                  </Typography>
                </Box>
              </Box>
            ))}
            
            {/* Edit builds button */}
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setMobileDetailDrawer(false);
                setEditMember(member);
              }}
              sx={{ 
                mt: 2,
                bgcolor: canEditProfile(member) ? '#90caf9' : '#666',
                color: '#000',
                '&:hover': { bgcolor: '#64b5f6' },
                '&.Mui-disabled': { bgcolor: '#444', color: '#888' }
              }}
              disabled={!canEditProfile(member)}
            >
              Edit Builds
            </Button>
          </Box>
        </Box>
      </SwipeableDrawer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, color: 'white' }}>
        Loading members...
      </Box>
    );
  }

  const headers = [
    { label: 'Avatar', key: null },
    { label: 'Name', key: 'username' },
    { label: 'Guild Role', key: 'role' },
    { label: 'Status', key: 'status' },
    { label: 'Weapons', key: 'weapon_spec' },
    { label: 'Combat Role', key: 'combat_role' },
    { label: 'Combat Power', key: 'combat_power' },
    { label: 'Actions', key: null }
  ];

  const filteredMembers = members.filter(member =>
    member.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const sortedMembers = getSortedMembers(filteredMembers);

  return (
    <>
      {/* Conditional rendering based on device size */}
      {isMobile ? (
        // Mobile view with cards
        renderMobileList()
      ) : (
        // Desktop view with table
        <TableContainer 
          component={Paper} 
          sx={{ 
            bgcolor: '#1e1e1e',
            overflowX: 'auto',
          }}
        >
          <Table size={isTablet ? "small" : "medium"}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1a1a1a' }}>
                {headers.map((header, index) => (
                  <TableCell 
                    key={index}
                    onClick={() => header.key && handleSort(header.key)}
                    sx={{ 
                      color: 'white', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #90caf9',
                      cursor: header.key ? 'pointer' : 'default',
                      padding: isTablet ? '12px 8px' : '16px',
                      whiteSpace: isTablet ? 'nowrap' : 'normal',
                      userSelect: 'none',
                      '&:hover': {
                        backgroundColor: header.key ? 'rgba(144, 202, 249, 0.1)' : 'inherit',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {header.label}
                      {sortConfig.key === header.key && (
                        <span>
                          {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedMembers.map((member) => (
                <TableRow 
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'rgba(144, 202, 249, 0.1)',
                    },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <TableCell sx={{ 
                    color: 'white', 
                    padding: isTablet ? '12px 8px' : '16px', 
                    width: '50px' 
                  }}>
                    <Avatar
                      src={member.avatarUrl || member.avatar_url}
                      alt={member.username}
                      sx={{ 
                        width: isTablet ? 36 : 40, 
                        height: isTablet ? 36 : 40,
                        border: '2px solid #90caf9'
                      }}
                    />
                  </TableCell>
                  
                  <TableCell sx={{ 
                    color: 'white', 
                    paddingLeft: isTablet ? '8px' : '16px',
                    fontSize: isTablet ? '0.875rem' : 'inherit'
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      position: 'relative',
                      '&:hover .name-edit-icon': {
                        opacity: 1
                      } 
                    }}>
                      <Typography variant={isTablet ? "body2" : "body1"} sx={{ fontWeight: 'bold' }}>
                        {member.username}
                      </Typography>
                      
                      {/* FIXED: Show edit icon for current user OR if current user is Guild Master */}
                      {canEditName(member) && (
                        <IconButton 
                          size="small"
                          className="name-edit-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNameEditMember(member);
                          }}
                          sx={{ 
                            opacity: 0,
                            ml: 1, 
                            p: 0.5,
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': { 
                              color: '#90caf9',
                              bgcolor: 'rgba(144, 202, 249, 0.1)'
                            },
                            transition: 'opacity 0.2s ease-in-out'
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell sx={{ color: 'white' }}>{member.role}</TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Chip 
                      label={member.status || 'Active'} 
                      sx={{ 
                        bgcolor: 'rgba(102, 255, 102, 0.2)',
                        color: '#66ff66',
                        fontWeight: 'medium'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {member.builds?.map((build, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          margin: '0.5rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px' 
                        }}>
                          {build.primary && (
                            <img 
                              src={getWeaponIcon(build.primary)} 
                              alt={build.primary}
                              style={{ 
                                width: 24, 
                                height: 24,
                                objectFit: 'contain'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          {build.secondary && (
                            <img 
                              src={getWeaponIcon(build.secondary)} 
                              alt={build.secondary}
                              style={{ 
                                width: 24, 
                                height: 24,
                                objectFit: 'contain'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <span style={{ color: '#90caf9' }}>
                          {member.weapon_spec || getWeaponSpec(build.primary, build.secondary)}
                        </span>
                      </div>
                    ))}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {member.builds?.map((build, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          margin: '0.5rem 0',
                          color: build.spec === 'DPS' ? '#ff6666' : 
                                build.spec === 'Tank' ? '#66b3ff' : 
                                '#66ff66'
                        }}
                      >
                        ⚔ {build.spec}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {member.builds?.map((build, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          margin: '0.5rem 0',
                          color: '#ffd700'
                        }}
                      >
                        {member.combat_power || 'N/A'}
                      </div>
                    ))}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: isTablet ? 0 : 1 }}>
                      {/* FIXED: Show edit icon based on permission check */}
                      {canEditProfile(member) && (
                        <Tooltip title="Edit Builds">
                          <IconButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditMember(member);
                            }}
                            sx={{ 
                              color: '#90caf9',
                              padding: isTablet ? '6px' : '8px',
                              '&:hover': { 
                                bgcolor: 'rgba(144, 202, 249, 0.2)',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <EditIcon fontSize={isTablet ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {/* King chess piece button ONLY appears for Guild Masters */}
                      {canManageRoles() && (
                        <Tooltip title="Manage Guild Role">
                          <IconButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleManagementMember(member);
                            }}
                            sx={{ 
                              color: '#ffd700', // Gold color for king
                              padding: isTablet ? '6px' : '8px',
                              '&:hover': { 
                                bgcolor: 'rgba(255, 215, 0, 0.2)',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <span role="img" aria-label="king" style={{ fontSize: isTablet ? '14px' : '18px' }}>♚</span>
                          </IconButton>
                        </Tooltip>
                      )}

                  {canManageRoles() && member.id !== effectiveCurrentUser.id && member.role !== 'Guild Master' && (
                        <Tooltip title="Remove from Guild">
                          <IconButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              setKickMemberConfirm(member);
                            }}
                            sx={{ 
                              color: '#ff4444', // Red color for delete
                              padding: isTablet ? '6px' : '8px',
                              '&:hover': { 
                                bgcolor: 'rgba(255, 68, 68, 0.2)',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <DeleteIcon fontSize={isTablet ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
  
      {/* Mobile drawer for member details */}
      {renderMobileDrawer()}
      
      {/* Dialogs remain unchanged */}
      {editMember && (
        <EditMemberDialog 
          member={editMember} 
          currentUser={effectiveCurrentUser}
          onClose={() => setEditMember(null)} 
          onSave={handleSave}
        />
      )}
  
      {roleManagementMember && (
        <RoleManagementDialog
          member={roleManagementMember}
          currentUserRole={effectiveCurrentUser?.role}
          currentUser={effectiveCurrentUser}
          onClose={() => setRoleManagementMember(null)}
          onSave={handleRoleSave}
        />
      )}
  
      {nameEditMember && (
        <NameEditDialog
          open={Boolean(nameEditMember)}
          onClose={() => setNameEditMember(null)}
          member={nameEditMember}
          onSave={handleNameChange}
        />
      )}
  
      {selectedMember && !isMobile && (
        <MemberProfileModal
          member={selectedMember}
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {kickMemberConfirm && (
        <KickMemberDialog
          member={kickMemberConfirm}
          onClose={() => setKickMemberConfirm(null)}
          onConfirm={handleKickMember}
        />
      )}
    </>
  );
}

const KickMemberDialog = ({ member, onClose, onConfirm }) => {
  if (!member) return null;
  
  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: '#1a1a1a', 
        color: 'red',
        fontSize: '20px'
      }}>
        ⚠️ Remove Member from Guild
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
        <Typography color="white" sx={{ mb: 3 }}>
          Are you sure you want to remove <strong>{member.username}</strong> from the guild?
        </Typography>
        <Typography color="white" sx={{ mb: 2 }}>
          This action cannot be undone. The member will need to be invited again to rejoin.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'white' }}>
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          color="error"
        >
          Remove Member
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MembersList;