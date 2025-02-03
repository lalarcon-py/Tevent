import { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Dialog, DialogTitle, DialogContent, Select, MenuItem, 
  Button, Avatar, Typography, Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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

const EditMemberDialog = ({ member, onClose, onSave }) => {
  const [editedMember, setEditedMember] = useState(member ? {
    ...member,
    builds: member.builds || [{
      primary: 'Greatsword',
      secondary: 'Crossbow',
      spec: 'DPS'
    }],
    weapon_spec: member.weapon_spec
  } : null);

  useEffect(() => {
    if (member) {
      setEditedMember({
        ...member,
        builds: member.builds || [{
          primary: 'Greatsword',
          secondary: 'Crossbow',
          spec: 'DPS'
        }]
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
  const [members, setMembers] = useState([]);
  const [editMember, setEditMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Current editMember state:', editMember);
  }, [editMember]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/members', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }
  
        const data = await response.json();
        console.log('Raw data from API:', data);
  
        const processedData = data.map(member => {
          try {
            // Handle the nested array structure directly
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
        builds: updatedMember.builds.map(build => ({
          primary: build.primary,
          secondary: build.secondary,
          spec: build.spec,
          weapon_spec: weaponSpec
        }))
      };
  
      console.log('Sending update data:', JSON.stringify(memberToUpdate, null, 2));
    
      const response = await fetch(`http://localhost:5000/api/members/${memberToUpdate.id}`, {
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

  const headers = ['Avatar', 'Name', 'Guild Role', 'Status', 'Weapons', 'Combat Role', 'Combat Power', 'Actions'];

  const filteredMembers = members.filter(member =>
    member.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <TableContainer component={Paper} sx={{ bgcolor: '#1e1e1e' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1a1a1a' }}>
              {headers.map((header, index) => (
                <TableCell 
                  key={index}
                  sx={{ 
                    color: 'white', 
                    fontWeight: 'bold',
                    borderBottom: '2px solid #90caf9'
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers.map((member) => (
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
                            color: '#ffd700' // Gold color for combat power
                          }}
                        >
                          {member.combat_power || 'N/A'}
                        </div>
                      ))}
                    </TableCell>
                <TableCell>
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Edit button clicked for member:', member);
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
    </>
  );
};

export default MembersList;