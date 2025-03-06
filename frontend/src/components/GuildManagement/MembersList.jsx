import { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, 
  Button, Avatar, Typography, Box, TextField, useMediaQuery, useTheme, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { useAuth } from '../../contexts/AuthContext';
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

const RoleManagementDialog = ({ member, currentUserRole, onClose, onSave }) => {
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [username, setUsername] = useState(member.username);
  const [error, setError] = useState(null);
  
  // Add a flag to check if this is a guild master transfer
  const isGuildMasterTransfer = selectedRole === 'Guild Master';

  // Update state when member changes
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
      setUsername(member.username);
    }
  }, [member]);

  

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
    // If not Guild Master, don't allow changing roles at all
    if (currentUserRole !== 'Guild Master') {
      return [];
    }
    
    return Object.keys(GUILD_ROLES).filter(role => {
      // Filter out duplicate "Member" if "Guild Member" exists
      if ((role === 'Member' && GUILD_ROLES['Guild Member']) || 
          (role === 'Guild Member' && GUILD_ROLES['Member'] && role !== member.role)) {
        return false;
      }
      
      return role !== 'Guild Master' || member.role === 'Guild Master';
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
        <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          Manage {member.username}'s Profile
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {/* Only show username field if not transferring guild master role */}
          {(currentUserRole === 'Guild Master' || currentUserRole === 'Guild Advisor') && 
           !isGuildMasterTransfer && (
            <Box sx={{ mb: 2 }}>
              <Typography color="white" sx={{ mb: 1 }}>Username</Typography>
              <TextField
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                sx={{ 
                  bgcolor: '#2d2d2d',
                  input: { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  }
                }}
              />
            </Box>
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
              // Only include username if not transferring guild master role
              ...(isGuildMasterTransfer ? {} : { username })
            })}
            sx={{ 
              bgcolor: '#90caf9',
              '&:hover': { bgcolor: '#64b5f6' }
            }}
          >
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
  
      <Dialog
        open={confirmTransfer}
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
      const isCurrentUser = member.id === currentUser?.id;
      const hasSpecialRole = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(member.role);
      setShowCombatPower(isCurrentUser || hasSpecialRole);
      
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
  }, [member, currentUser]);

  // Add the new permission check
  useEffect(() => {
    // If trying to edit someone else's profile and not Guild Master, close the dialog
    if (member && currentUser && member.id !== currentUser.id && currentUser.role !== 'Guild Master') {
      onClose();
    }
  }, [member, currentUser, onClose]);

  const weapons = [
    'Greatsword', 'Sword and Shield', 'Staff', 'Crossbow',
    'Dagger', 'Wand', 'Bow', 'Spear'
  ];

  const handleAddBuild = () => {
    setEditedMember({
      ...editedMember,
      builds: [
        ...editedMember.builds,
        { primary: 'Greatsword', secondary: 'Crossbow', spec: 'DPS' }
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
    updatedBuilds[buildIndex].primary = value;
    setEditedMember({ ...editedMember, builds: updatedBuilds });
  };

  const handleSecondaryWeaponChange = (buildIndex, value) => {
    const updatedBuilds = [...editedMember.builds];
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

            {showCombatPower && (
              <Box sx={{ mb: 2 }}>
                <Typography color="white" sx={{ mb: 1 }}>Combat Power</Typography>
                <TextField
                  type="number"
                  value={editedMember.combat_power || ''}
                  onChange={(e) => setEditedMember({
                    ...editedMember,
                    combat_power: e.target.value
                  })}
                  fullWidth
                  sx={{ 
                    bgcolor: '#2d2d2d',
                    input: { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    }
                  }}
                />
              </Box>
            )}


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
  const { user: authCurrentUser } = useAuth();
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
  const effectiveCurrentUser = propCurrentUser || authCurrentUser;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
      const guildId = localStorage.getItem('guildId');
      if (!guildId) {
        console.error('No guild ID found');
        return;
      }
      
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
      
      // Use axios instead of fetch for consistency and better error handling
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

  useEffect(() => {
    console.log('Current editMember state:', editMember);
  }, [editMember]);

  const fetchMembers = async () => {
    try {
      // Get current guild ID
      const guildId = localStorage.getItem('guildId');
      
      if (!guildId) {
        console.error('No guild ID found');
        setLoading(false);
        return;
      }
  
      console.log('Fetching members for guild:', guildId);
      
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/members`, {
        credentials: 'include'
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
      
      const weaponSpec = getWeaponSpec(
        updatedMember.builds[0].primary, 
        updatedMember.builds[0].secondary
      );
  
      const memberToUpdate = {
        ...updatedMember,
        guildId, // Add guild ID to request body
        weapon_spec: weaponSpec,
        combat_power: updatedMember.combat_power,
        builds: updatedMember.builds.map(build => ({
          primary: build.primary,
          secondary: build.secondary,
          spec: build.spec,
          weapon_spec: weaponSpec
        }))
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
      <TableContainer 
        component={Paper} 
        sx={{ 
          bgcolor: '#1e1e1e',
          overflowX: 'auto', // Ensure horizontal scrolling on mobile
        }}
      >
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1a1a1a' }}>
              {headers.map((header, index) => (
                // On mobile, only show important columns
                (!isMobile || (isMobile && ['Avatar', 'Name', 'Actions'].includes(header.label))) && (
                  <TableCell 
                    key={index}
                    onClick={() => header.key && handleSort(header.key)}
                    sx={{ 
                      color: 'white', 
                      fontWeight: 'bold',
                      borderBottom: '2px solid #90caf9',
                      cursor: header.key ? 'pointer' : 'default',
                      padding: isMobile ? '8px 4px' : '16px',
                      whiteSpace: isMobile ? 'nowrap' : 'normal',
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
                )
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
                  padding: isMobile ? '8px 4px' : '16px', 
                  width: '50px' 
                }}>
                  <Avatar
                    src={member.avatarUrl || member.avatar_url}
                    alt={member.username}
                    sx={{ 
                      width: isMobile ? 32 : 40, 
                      height: isMobile ? 32 : 40,
                      border: '2px solid #90caf9'
                    }}
                  />
                </TableCell>
                
                <TableCell sx={{ 
                  color: 'white', 
                  paddingLeft: isMobile ? '4px' : '16px',
                  fontSize: isMobile ? '0.875rem' : 'inherit'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    position: 'relative',
                    '&:hover .name-edit-icon': {
                      opacity: 1
                    } 
                  }}>
                    <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontWeight: 'bold' }}>
                      {member.username}
                    </Typography>
                    
                    {/* Only show edit icon for current user */}
                    {member.id === effectiveCurrentUser?.id && (
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
                    
                    {isMobile && (
                      <Typography variant="caption" sx={{ color: '#90caf9' }}>
                        {member.role}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                {/* Only show these cells on desktop */}
                {!isMobile && (
                  <>
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
                  </>
                )}
                
                <TableCell>
                  <Box sx={{ display: 'flex', gap: isMobile ? 0 : 1 }}>
                    {/* Only show edit icon if it's the current user's own profile OR if the current user is Guild Master */}
                    {(member.id === effectiveCurrentUser?.id || currentUserRole === 'Guild Master') && (
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditMember(member);
                        }}
                        sx={{ 
                          color: '#90caf9',
                          padding: isMobile ? '4px' : '8px',
                          '&:hover': { 
                            bgcolor: 'rgba(144, 202, 249, 0.2)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        <EditIcon fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    )}
                    
                    {/* ONLY show role management icon for Guild Masters */}
                    {currentUserRole === 'Guild Master' && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleManagementMember(member);
                        }}
                        sx={{ 
                          color: '#ffd700',
                          padding: isMobile ? '4px' : '8px',
                          '&:hover': { 
                            bgcolor: 'rgba(255, 215, 0, 0.2)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        <StarIcon fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
  
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
          currentUserRole={currentUserRole}
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
  
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}

export default MembersList;