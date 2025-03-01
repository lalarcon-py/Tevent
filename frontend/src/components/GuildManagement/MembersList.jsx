import { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Dialog, DialogTitle, DialogContent, Select, MenuItem, 
  Button, Avatar, Typography, Box, TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';

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

  const handleRoleChange = async (newRole) => {
    setError(null);

    if (newRole === 'Guild Master') {
      setConfirmTransfer(true);
      return;
    }

    if (newRole === 'Guild Guardian') {
      const guardianCount = await fetch(`${API_URL}/api/members/count-guardians`, {
        credentials: 'include'
      }).then(res => res.json());
      
      if (guardianCount >= 5 && member.role !== 'Guild Guardian') {
        setError('Maximum of 5 Guild Guardians allowed');
        return;
      }
    }

    setSelectedRole(newRole);
  };

  const getAvailableRoles = () => {
    const currentUserRoleLevel = GUILD_ROLES[currentUserRole];
    return Object.keys(GUILD_ROLES).filter(role => {
      const roleLevel = GUILD_ROLES[role];
      if (currentUserRole === 'Guild Master') {
        return role !== 'Guild Master' || member.role === 'Guild Master';
      }
      if (currentUserRole === 'Guild Advisor') {
        return roleLevel < GUILD_ROLES['Guild Advisor'];
      }
      return false;
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
          {(currentUserRole === 'Guild Master' || currentUserRole === 'Guild Advisor') && (
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
              username: username 
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

const EditMemberDialog = ({ member, onClose, onSave }) => {
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
      const hasPermission = ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(member.role);
      setShowCombatPower(hasPermission);
      
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
  }, [member]);

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
// End of edit button functions

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


const MembersList = ({ searchTerm }) => {
  const [roleManagementMember, setRoleManagementMember] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [editMember, setEditMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

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
      const endpoint = updatedMember.role === 'Guild Master' 
        ? `${API_URL}/api/members/transfer-guildmaster`
        : `${API_URL}/api/members/${updatedMember.id}`;
  
      console.log('Sending update:', {
        id: updatedMember.id,
        role: updatedMember.role,
        username: updatedMember.username
      });
  
      const response = await fetch(endpoint, {
        method: updatedMember.role === 'Guild Master' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: updatedMember.id,
          role: updatedMember.role,
          username: updatedMember.username,
          discord_id: updatedMember.discord_id,
          status: updatedMember.status,
          avatar_url: updatedMember.avatar_url,
          builds: updatedMember.builds,
          combat_power: updatedMember.combat_power
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update member');
      }
  
      await fetchMembers();
      setRoleManagementMember(null);
  
      if (updatedMember.role === 'Guild Master') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating member:', error);
      setError(error.message || 'Failed to update member');
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
      const response = await fetch(`${API_URL}/api/members`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
  
      const data = await response.json();
      console.log('Raw data from API:', data);
  
      const processedData = data.map(member => {
        try {
          const builds = Array.isArray(member.builds[0]) ? 
            member.builds[0] : member.builds;
  
          return {
            ...member,
            builds: builds,
            weapon_spec: member.weapon_spec || (builds[0]?.weapon_spec || '')
          };
        } catch (error) {
          console.error('Error processing member:', error);
          const defaultBuild = {
            primary: 'Greatsword',
            secondary: 'Crossbow',
            spec: 'DPS'
          };
          return {
            ...member,
            builds: [defaultBuild],
            weapon_spec: getWeaponSpec(defaultBuild.primary, defaultBuild.secondary)
          };
        }
      });
  
      console.log('Processed data:', processedData);
      setMembers(processedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSave = async (updatedMember) => {
    try {
      const weaponSpec = getWeaponSpec(
        updatedMember.builds[0].primary, 
        updatedMember.builds[0].secondary
      );
  
      const memberToUpdate = {
        ...updatedMember,
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
    
      const response = await fetch(`${API_URL}/api/members/${memberToUpdate.id}`, {
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
      <TableContainer component={Paper} sx={{ bgcolor: '#1e1e1e' }}>
        <Table>
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
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(144, 202, 249, 0.1)',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <TableCell sx={{ color: 'white', padding: '8px', width: '50px' }}>
                  <Avatar
                    src={member.avatar_url}
                    alt={member.username}
                    sx={{ 
                      width: 40, 
                      height: 40,
                      border: '2px solid #90caf9'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'white', paddingLeft: '8px' }}>
                  {member.username}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>{member.role}</TableCell>
                <TableCell sx={{ color: 'white' }}>{member.status}</TableCell>
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
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditMember(member);
                      }}
                      sx={{ 
                        color: '#90caf9',
                        '&:hover': { 
                          bgcolor: 'rgba(144, 202, 249, 0.2)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    {(currentUserRole === 'Guild Master' || 
                      (currentUserRole === 'Guild Advisor' && 
                       member.role !== 'Guild Master' && 
                       member.role !== 'Guild Advisor')) && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleManagementMember(member);
                        }}
                        sx={{ 
                          color: '#ffd700',
                          '&:hover': { 
                            bgcolor: 'rgba(255, 215, 0, 0.2)',
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        <StarIcon />
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
          onClose={() => {
            console.log('Dialog closing');
            setEditMember(null);
          }} 
          onSave={(updatedMember) => {
            console.log('Saving member:', updatedMember);
            handleSave(updatedMember);
          }}
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
    </>
  );
}

export default MembersList;