// frontend/src/components/StaticTeams/StaticTeams.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import html2canvas from 'html2canvas';
import { 
  Box, 
  Typography, 
  Grid, 
  Button, 
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ShieldIcon from '@mui/icons-material/Shield';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../config/axios';

const API_URL = process.env.REACT_APP_API_URL || '';

// Weapon Specs mapping (keeping this from TeamPlanner)
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
  if (!primary || !secondary) return 'Unknown';
  
  // Try both orders of the weapons
  const combo1 = `${primary}|${secondary}`;
  const combo2 = `${secondary}|${primary}`;
  
  return WEAPON_SPECS[combo1] || WEAPON_SPECS[combo2] || 'Unknown';
};

// Function to determine a member's combat role based on their build data
const getMemberSpec = (member) => {
  if (!member) return 'Unknown';
  
  // First check builds from the member or User object
  let builds = [];
  
  if (member.User?.builds && Array.isArray(member.User.builds)) {
    builds = member.User.builds;
  } else if (member.builds && Array.isArray(member.builds)) {
    builds = member.builds;
  } else if (member.User?.builds && typeof member.User.builds === 'string') {
    try {
      builds = JSON.parse(member.User.builds);
    } catch (e) {
      console.error('Error parsing builds string:', e);
      builds = [];
    }
  } else if (member.builds && typeof member.builds === 'string') {
    try {
      builds = JSON.parse(member.builds);
    } catch (e) {
      console.error('Error parsing builds string:', e);
      builds = [];
    }
  }
  
  // Ensure builds is an array
  builds = Array.isArray(builds) ? builds : [];
  
  // If we have at least one build, return its spec
  if (builds.length > 0 && builds[0]?.spec) {
    return builds[0].spec;
  }
  
  // Default to DPS if no spec found
  return 'DPS';
};

// Component to show when player's build selection is needed
const BuildSelectionDialog = ({ open, member, onClose, onSelectBuild }) => {
  const builds = member?.builds || [];
  
  if (builds.length <= 1) return null;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
        Select Build for {member?.User?.username || member?.username}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', pt: 2 }}>
        <Typography color="white" sx={{ mb: 2 }}>
          Please select which build you want to use for this static team:
        </Typography>
        <List>
          {builds.map((build, index) => (
            <ListItem
              key={index}
              button
              onClick={() => onSelectBuild(index, build)}
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 1,
                mb: 1,
                '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                {build.primary && (
                  <img
                    src={`/weapons/${build.primary} Art.png`}
                    alt={build.primary}
                    style={{ width: 24, height: 24 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                {build.secondary && (
                  <img
                    src={`/weapons/${build.secondary} Art.png`}
                    alt={build.secondary}
                    style={{ width: 24, height: 24 }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
              </Box>
              <ListItemText
                primary={
                  <Typography color="white">
                    {build.primary} + {build.secondary}
                  </Typography>
                }
                secondary={
                  <Typography color={
                    build.spec === 'Tank' ? '#66b3ff' :
                    build.spec === 'Healer' ? '#66ff66' : '#ff6666'
                  }>
                    {build.spec}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1e1e1e', p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'white' }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// The draggable member component
const DraggableMember = ({ member, onRemove, getRoleStyles }) => {
  const dragRef = React.useRef(null);
  
  React.useEffect(() => {
    const currentEl = dragRef.current;
    if (!currentEl) return;
    
    const handleDragStart = (e) => {
      const memberId = member.user_id || member.id || (member.User?.id);
      
      if (!memberId) {
        console.error('No valid ID found for member:', member);
        e.preventDefault();
        return;
      }
      
      try {
        e.dataTransfer.setData('text/plain', memberId);
        e.dataTransfer.setData('memberId', memberId);
      } catch (err) {
        console.error('Error setting drag data:', err);
      }
      
      currentEl.classList.add('dragging');
    };
    
    const handleDragEnd = () => {
      currentEl.classList.remove('dragging');
    };
    
    // Directly attach event listeners to the DOM element
    currentEl.setAttribute('draggable', 'true');
    currentEl.addEventListener('dragstart', handleDragStart);
    currentEl.addEventListener('dragend', handleDragEnd);
    
    // Clean up event listeners
    return () => {
      currentEl.removeEventListener('dragstart', handleDragStart);
      currentEl.removeEventListener('dragend', handleDragEnd);
    };
  }, [member]);

  // Prioritize selected_build
  let activeBuild = null;
  
  // First try to use selected_build
  if (member.selected_build) {
    activeBuild = member.selected_build;
  } 
  // If no selected_build, use builds array
  else {
    let builds = [];
    
    if (member.User?.builds && Array.isArray(member.User.builds)) {
      builds = member.User.builds;
    } else if (member.builds && Array.isArray(member.builds)) {
      builds = member.builds;
    } else if (member.User?.builds && typeof member.User.builds === 'string') {
      try {
        builds = JSON.parse(member.User.builds);
      } catch (e) {
        console.error('Error parsing builds string:', e);
        builds = [];
      }
    } else if (member.builds && typeof member.builds === 'string') {
      try {
        builds = JSON.parse(member.builds);
      } catch (e) {
        console.error('Error parsing builds string:', e);
        builds = [];
      }
    }
    
    // Try to find a build matching the role
    if (member.role && builds.length > 0) {
      const roleMapping = {
        'TANK': 'Tank',
        'HEALER': 'Healer',
        'DPS': 'DPS'
      };
      
      const normalizedRole = roleMapping[member.role.toUpperCase()] || member.role;
      
      activeBuild = builds.find(b => 
        b.spec && b.spec.toUpperCase() === normalizedRole.toUpperCase()
      ) || builds[0];
    }
  }
  
  // Get weapon information
  const primaryWeapon = activeBuild?.primary || '';
  const secondaryWeapon = activeBuild?.secondary || '';
  
  // Calculate weapon spec
  const weaponSpec = getWeaponSpec(primaryWeapon, secondaryWeapon);
  
  // Get role-specific styling
  const roleStyles = getRoleStyles(member.role);
  
  return (
    <Box 
      ref={dragRef} 
      draggable={true}
      sx={{
        position: 'relative',
        padding: '10px 12px',
        mb: 1.5,
        width: '100%',
        backgroundColor: 'rgba(24, 24, 27, 0.7)',
        backgroundImage: roleStyles.bgGradient,
        color: 'white',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: roleStyles.borderColor || 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
        cursor: 'grab',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          backgroundColor: 'rgba(32, 32, 36, 0.95)',
        },
        '&:active': {
          cursor: 'grabbing',
          transform: 'translateY(0)',
        },
        '&.dragging': {
          opacity: 0.6,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
        },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Role indicator */}
      <Box 
        sx={{ 
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          backgroundColor: roleStyles.color,
          borderRadius: '8px 0 0 8px'
        }} 
      />
      
      {/* Weapon icons with circular backgrounds */}
      <Box sx={{ 
        mr: 2,
        display: 'flex',
        position: 'relative'
      }}>
        {primaryWeapon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              zIndex: 2
            }}
          >
            <Tooltip title={primaryWeapon}>
              <img 
                src={`/weapons/${primaryWeapon} Art.png`}
                alt={primaryWeapon}
                style={{ 
                  width: 24, 
                  height: 24, 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))'
                }}
                onError={(e) => { 
                  console.error(`Failed to load image: ${primaryWeapon}`);
                  e.target.style.display = 'none'; 
                }}
              />
            </Tooltip>
          </Box>
        )}
        {secondaryWeapon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              ml: '-10px',
              zIndex: 1
            }}
          >
            <Tooltip title={secondaryWeapon}>
              <img 
                src={`/weapons/${secondaryWeapon} Art.png`}
                alt={secondaryWeapon}
                style={{ 
                  width: 24, 
                  height: 24, 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))'
                }}
                onError={(e) => { 
                  console.error(`Failed to load image: ${secondaryWeapon}`);
                  e.target.style.display = 'none'; 
                }}
              />
            </Tooltip>
          </Box>
        )}
      </Box>
      
      {/* Text content */}
      <Box sx={{ 
        flexGrow: 1,
        overflow: 'hidden'
      }}>
        {/* Character name */}
        <Typography 
          variant="body2"
          sx={{
            fontSize: '0.95rem',
            fontWeight: 500,
            color: 'white',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {member.User?.username || member.username}
        </Typography>
        
        {/* Role and spec text */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="caption"
            sx={{
              color: roleStyles.color,
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            {member.role}
          </Typography>
          
          {weaponSpec && (
            <>
              <Box 
                sx={{ 
                  width: '4px', 
                  height: '4px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255,255,255,0.5)', 
                  mx: 0.5 
                }} 
              />
              <Typography 
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8rem'
                }}
              >
                {weaponSpec}
              </Typography>
            </>
          )}
        </Box>
      </Box>
      
      {/* Combat power if available */}
      {member.combat_power && (
        <Box sx={{ 
          ml: 1.5,
          px: 1.5,
          py: 0.5,
          borderRadius: '50px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <Typography sx={{ 
            color: '#ffd700',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            CP {member.combat_power}
          </Typography>
        </Box>
      )}
      
      {/* Remove button */}
      {onRemove && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            onRemove(member);
          }}
          sx={{
            ml: 1,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 68, 68, 0.3)',
              color: 'white'
            }
          }}
        >
          ×
        </Box>
      )}
    </Box>
  );
};

const StaticTeams = () => {
  const { simulatedRole } = useSimulatedRole();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState([]);
  const [openPresetDialog, setOpenPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [guildId, setGuildId] = useState(null);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [deletePresetDialog, setDeletePresetDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);

  // Helper function to determine if user has permission to edit teams
  const hasEditPermission = () => {
    // Get effective role (simulated or actual)
    const effectiveRole = simulatedRole || userRole || user?.role;
    
    // Only Guild Master, Guild Advisor, and Guild Guardian can edit teams
    return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
  };

  // Role styling function
  const getRoleStyles = (role) => {
    if (!role) return { color: 'white', bgGradient: 'linear-gradient(to right, #2c2c2c, #1a1a1a)' };
    
    const roleUpper = role.toUpperCase();
    if (roleUpper === 'TANK') {
      return {
        color: '#66b3ff',
        bgGradient: 'linear-gradient(to right, rgba(102, 179, 255, 0.15), rgba(102, 179, 255, 0.05))',
        borderColor: 'rgba(102, 179, 255, 0.3)'
      };
    }
    if (roleUpper === 'HEALER') {
      return {
        color: '#66ff66', 
        bgGradient: 'linear-gradient(to right, rgba(102, 255, 102, 0.15), rgba(102, 255, 102, 0.05))',
        borderColor: 'rgba(102, 255, 102, 0.3)'
      };
    }
    if (roleUpper === 'DPS') {
      return {
        color: '#ff6666',
        bgGradient: 'linear-gradient(to right, rgba(255, 102, 102, 0.15), rgba(255, 102, 102, 0.05))',
        borderColor: 'rgba(255, 102, 102, 0.3)'
      };
    }
    
    return { color: 'white', bgGradient: 'linear-gradient(to right, #2c2c2c, #1a1a1a)' };
  };

  // Format member with builds helper
  const formatMemberWithBuilds = (member) => {
    if (!member) return null;
    
    // Get builds from User or directly
    let builds = [];
    
    if (member.User && member.User.builds) {
      builds = member.User.builds;
    } else if (member.builds) {
      builds = member.builds;
    }
    
    // If builds is a string, parse it
    if (typeof builds === 'string') {
      try {
        builds = JSON.parse(builds);
      } catch (e) {
        console.error('Error parsing builds string:', e);
        builds = [];
      }
    }
    
    // Ensure builds is an array
    builds = Array.isArray(builds) ? builds : [];
    
    // Handle the selected build
    let selectedBuild = member.selectedBuild || member.selected_build;
    
    // If selected_build is a string, try to parse it
    if (typeof selectedBuild === 'string') {
      try {
        selectedBuild = JSON.parse(selectedBuild);
      } catch (e) {
        console.error('Error parsing selected_build string:', e);
        selectedBuild = null;
      }
    }
    
    // If no selected build but we have builds, use the first one matching the role
    if (!selectedBuild && builds.length > 0) {
      if (member.role) {
        // Try to find a build matching the role
        const roleToSpec = {
          'TANK': 'Tank',
          'HEALER': 'Healer',
          'DPS': 'DPS'
        };
        
        const normalizedRole = roleToSpec[member.role.toUpperCase()] || member.role;
        
        selectedBuild = builds.find(build => 
          build.spec && build.spec.toUpperCase() === normalizedRole.toUpperCase()
        ) || builds[0];
      } else {
        selectedBuild = builds[0];
      }
    }
    
    // Ensure User property exists
    const userInfo = member.User || {};
    
    return {
      ...member,
      user_id: member.user_id || member.id || userInfo.id,
      User: {
        ...userInfo,
        id: userInfo.id || member.user_id || member.id,
        builds: builds
      },
      builds: builds,
      selectedBuild: selectedBuild,
      selected_build: selectedBuild
    };
  };

  // Fetch guild ID and user role
  useEffect(() => {
    const fetchGuildId = async () => {
      try {
        // Try from localStorage first
        const storedGuildId = localStorage.getItem('guildId');
        if (storedGuildId) {
          setGuildId(storedGuildId);
          return;
        }

        // Otherwise fetch from API
        const response = await axiosInstance.get('/api/guilds/my-guilds');
        
        if (response.status === 200 && response.data.length > 0) {
          const fetchedGuildId = response.data[0].id;
          setGuildId(fetchedGuildId);
          localStorage.setItem('guildId', fetchedGuildId);
        }
      } catch (error) {
        console.error('Error fetching guild ID:', error);
      }
    };

    const fetchUserRole = async () => {
      try {
        const response = await axiosInstance.get('/api/auth/status');
        if (response.status === 200) {
          setUserRole(response.data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    
    fetchGuildId();
    fetchUserRole();
  }, []);

  // Fetch static teams and members when guildId is available
  useEffect(() => {
    if (!guildId) return;
  
    const fetchStaticTeams = async () => {
      try {
        // Fetch static teams
        const teamsResponse = await axiosInstance.get(`/api/static-teams?guildId=${guildId}`);
        if (teamsResponse.status === 200) {
          const fetchedTeams = teamsResponse.data || [];
          setTeams(fetchedTeams);
          
          // Collect all member IDs already assigned to teams
          const assignedMemberIds = new Set();
          fetchedTeams.forEach(team => {
            team.members?.forEach(member => {
              const memberId = member.user_id || member.id || (member.User?.id);
              if (memberId) {
                assignedMemberIds.add(memberId);
              }
            });
          });
  
          // Fetch all guild members
          const membersResponse = await axiosInstance.get(`/api/guilds/${guildId}/members`);
          if (membersResponse.status === 200) {
            // Process members to ensure they have the correct structure
            // AND filter out members who are already in teams
            const processedMembers = membersResponse.data
              .map(formatMemberWithBuilds)
              .filter(member => {
                const memberId = member.user_id || member.id || (member.User?.id);
                return !assignedMemberIds.has(memberId);
              });
              
            setMembers(processedMembers);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load static teams data');
      }
    };
  
    fetchStaticTeams();
  }, [guildId]);

  // Handle team creation
  const handleCreateTeam = async () => {
    if (!hasEditPermission()) {
      setError('You do not have permission to create teams');
      return;
    }

    try {
      const response = await axiosInstance.post('/api/static-teams', {
        name: newTeamName || `Team ${teams.length + 1}`,
        guildId
      });

      if (response.status === 201) {
        setTeams([...teams, { ...response.data, members: [] }]);
        setTeamDialogOpen(false);
        setNewTeamName('');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team');
    }
  };

  // Handle team update
  const handleUpdateTeam = async (team) => {
    if (!hasEditPermission()) {
      setError('You do not have permission to edit teams');
      return;
    }

    try {
      const response = await axiosInstance.put(`/api/static-teams/${team.id}`, {
        name: newTeamName,
        guildId
      });

      if (response.status === 200) {
        setTeams(teams.map(t => t.id === team.id ? { ...t, name: newTeamName } : t));
        setTeamDialogOpen(false);
        setNewTeamName('');
        setEditingTeam(null);
      }
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    }
  };

  // Handle team deletion
  const handleDeleteTeam = async (teamId) => {
    if (!hasEditPermission()) {
      setError('You do not have permission to delete teams');
      return;
    }

    try {
      const response = await axiosInstance.delete(`/api/static-teams/${teamId}?guildId=${guildId}`);

      if (response.status === 200) {
        // Move team members back to available pool
        const team = teams.find(t => t.id === teamId);
        if (team?.members?.length) {
          setMembers([...members, ...team.members]);
        }
        
        // Remove team from state
        setTeams(teams.filter(t => t.id !== teamId));
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team');
    }
  };

  // Handle member drop on team
  const handleDrop = async (memberId, teamId) => {
    if (!hasEditPermission()) {
      setError('You do not have permission to modify teams');
      return;
    }

    try {
      // Find the member
      let member = members.find(m => 
        m.id === memberId || m.user_id === memberId || 
        (m.User && m.User.id === memberId)
      );
      
      let sourceTeamId = null;

      // If not found in available members, check teams
      if (!member) {
        for (const team of teams) {
          const foundMember = team.members?.find(m => 
            m.id === memberId || m.user_id === memberId || 
            (m.User && m.User.id === memberId)
          );
          
          if (foundMember) {
            member = foundMember;
            sourceTeamId = team.id;
            break;
          }
        }
      }

      if (!member) {
        console.error('Member not found:', memberId);
        return;
      }

      if (sourceTeamId === teamId) {
        return; // Same team, no change needed
      }

      const userId = member.user_id || member.id || (member.User && member.User.id);
      
      // Extract the member's role from their builds data
      const spec = getMemberSpec(member);
      // Convert spec to role format expected by API
      const role = spec === 'Tank' ? 'TANK' : 
                  spec === 'Healer' ? 'HEALER' : 'DPS';
      
      // Extract selected build
      const selectedBuild = member.selectedBuild || member.selected_build || 
                          (member.builds && member.builds.length > 0 ? member.builds[0] : null);

      // Make API call to update team membership
      const response = await axiosInstance.post(`/api/static-teams/${teamId}/members`, {
        memberId: userId,
        role: role,
        sourceTeamId,
        guildId,
        selectedBuild
      });

      if (response.status === 200) {
        // Update UI state
        if (sourceTeamId) {
          // Moving between teams
          setTeams(prev => prev.map(team => {
            if (team.id === sourceTeamId) {
              return {
                ...team,
                members: team.members.filter(m => 
                  m.id !== memberId && 
                  m.user_id !== memberId && 
                  (m.User?.id !== memberId)
                )
              };
            }
            if (team.id === teamId) {
              return {
                ...team,
                members: [...(team.members || []), {
                  ...member,
                  role: role,
                  selectedBuild
                }]
              };
            }
            return team;
          }));
        } else {
          // Moving from available members to team
          setMembers(prev => prev.filter(m => 
            m.id !== memberId && 
            m.user_id !== memberId && 
            (m.User?.id !== memberId)
          ));
          
          setTeams(prev => prev.map(team => {
            if (team.id === teamId) {
              return {
                ...team,
                members: [...(team.members || []), {
                  ...member,
                  role: role,
                  selectedBuild
                }]
              };
            }
            return team;
          }));
        }
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      setError('Failed to update team');
    }
  };

  // Handle removing a member from a team
  const handleRemoveMember = async (teamId, member) => {
    if (!hasEditPermission()) {
      setError('You do not have permission to remove team members');
      return;
    }
    
    try {
      const userId = member.user_id || member.id || (member.User?.id);
      
      const response = await axiosInstance.delete(`/api/static-teams/${teamId}/members/${userId}?guildId=${guildId}`);
      
      if (response.status === 200) {
        // Add back to available members
        setMembers([...members, formatMemberWithBuilds(member)]);
        
        // Remove from team
        setTeams(prev => prev.map(team => {
          if (team.id === teamId) {
            return {
              ...team,
              members: team.members.filter(m => 
                m.user_id !== userId && 
                m.id !== userId && 
                (m.User?.id !== userId)
              )
            };
          }
          return team;
        }));
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      setError('Failed to remove team member');
    }
  };

  // Handle build selection
  const handleBuildSelect = (member) => {
    setSelectedMember(member);
    setBuildDialogOpen(true);
  };

  // Handle build change
  const handleBuildChange = async (index, build) => {
    if (!selectedMember) return;
    
    const userId = selectedMember.user_id || selectedMember.id || (selectedMember.User?.id);
    
    // Find if member is in available pool or a team
    let inAvailablePool = false;
    let teamId = null;
    
    // Check available pool first
    if (members.some(m => 
      m.id === userId || m.user_id === userId || (m.User?.id === userId)
    )) {
      inAvailablePool = true;
    } else {
      // Check teams
      for (const team of teams) {
        if (team.members?.some(m => 
          m.id === userId || m.user_id === userId || (m.User?.id === userId)
        )) {
          teamId = team.id;
          break;
        }
      }
    }
    
    try {
      // Update the member's build in the database
      if (teamId) {
        await axiosInstance.put(`/api/static-teams/${teamId}/members/${userId}`, {
          selectedBuild: build,
          guildId
        });
      }
      
      // Update local state
      if (inAvailablePool) {
        setMembers(prev => prev.map(m => {
          if (m.id === userId || m.user_id === userId || (m.User?.id === userId)) {
            return {
              ...m,
              selectedBuild: build,
              selected_build: build
            };
          }
          return m;
        }));
      } else if (teamId) {
        setTeams(prev => prev.map(team => {
          if (team.id === teamId) {
            return {
              ...team,
              members: team.members.map(m => {
                if (m.id === userId || m.user_id === userId || (m.User?.id === userId)) {
                  return {
                    ...m,
                    selectedBuild: build,
                    selected_build: build
                  };
                }
                return m;
              })
            };
          }
          return team;
        }));
      }
    } catch (error) {
      console.error('Error updating member build:', error);
      setError('Failed to update member build');
    }
    
    // Close dialog
    setBuildDialogOpen(false);
    setSelectedMember(null);
  };

  // Handle screenshot capture
  const captureTeamScreenshot = async () => {
    if (teams.length === 0) return;
    
    setIsScreenshotting(true);
    
    try {
      // Create a clean container for the screenshot
      const screenshotContainer = document.createElement('div');
      screenshotContainer.style.padding = '20px';
      screenshotContainer.style.backgroundColor = '#121212';
      screenshotContainer.style.borderRadius = '8px';
      screenshotContainer.style.position = 'absolute';
      screenshotContainer.style.left = '-9999px';
      screenshotContainer.style.width = '1200px';
      
      // Add title
      const title = document.createElement('h2');
      title.textContent = 'Static Teams';
      title.style.color = 'white';
      title.style.marginBottom = '20px';
      screenshotContainer.appendChild(title);
      
      // Create grid container
      const gridContainer = document.createElement('div');
      gridContainer.style.display = 'grid';
      gridContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
      gridContainer.style.gap = '16px';
      
      // Add each team
      teams.forEach(team => {
        const teamElement = document.createElement('div');
        teamElement.style.backgroundColor = '#1e1e1e';
        teamElement.style.borderRadius = '8px';
        teamElement.style.overflow = 'hidden';
        teamElement.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        
        // Team header
        const header = document.createElement('div');
        header.style.padding = '12px';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        header.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        
        const headerContent = document.createElement('div');
        headerContent.style.display = 'flex';
        headerContent.style.justifyContent = 'space-between';
        headerContent.style.alignItems = 'center';
        
        const teamName = document.createElement('h3');
        teamName.textContent = team.name;
        teamName.style.color = 'white';
        teamName.style.margin = '0';
        teamName.style.fontSize = '16px';
        
        headerContent.appendChild(teamName);
        
        // Role counts
        const roleCounts = document.createElement('div');
        
        const tankCount = document.createElement('span');
        tankCount.textContent = `Tank: ${team.members?.filter(m => m.role?.toUpperCase() === 'TANK').length || 0}`;
        tankCount.style.backgroundColor = 'rgba(102, 179, 255, 0.2)';
        tankCount.style.borderRadius = '16px';
        tankCount.style.padding = '4px 8px';
        tankCount.style.marginRight = '4px';
        tankCount.style.color = '#66b3ff';
        tankCount.style.fontSize = '12px';
        
        const healerCount = document.createElement('span');
        healerCount.textContent = `Healer: ${team.members?.filter(m => m.role?.toUpperCase() === 'HEALER').length || 0}`;
        healerCount.style.backgroundColor = 'rgba(102, 255, 102, 0.2)';
        healerCount.style.borderRadius = '16px';
        healerCount.style.padding = '4px 8px';
        healerCount.style.marginRight = '4px';
        healerCount.style.color = '#66ff66';
        healerCount.style.fontSize = '12px';
        
        const dpsCount = document.createElement('span');
        dpsCount.textContent = `DPS: ${team.members?.filter(m => m.role?.toUpperCase() === 'DPS').length || 0}`;
        dpsCount.style.backgroundColor = 'rgba(255, 102, 102, 0.2)';
        dpsCount.style.borderRadius = '16px';
        dpsCount.style.padding = '4px 8px';
        dpsCount.style.color = '#ff6666';
        dpsCount.style.fontSize = '12px';
        
        roleCounts.appendChild(tankCount);
        roleCounts.appendChild(healerCount);
        roleCounts.appendChild(dpsCount);
        
        headerContent.appendChild(roleCounts);
        header.appendChild(headerContent);
        teamElement.appendChild(header);
        
        // Team members
        const membersContainer = document.createElement('div');
        membersContainer.style.padding = '12px';
        membersContainer.style.minHeight = '150px';
        
        if (team.members?.length) {
          team.members.forEach(member => {
            const memberEl = document.createElement('div');
            memberEl.style.marginBottom = '8px';
            memberEl.style.padding = '10px 12px';
            memberEl.style.borderRadius = '8px';
            memberEl.style.position = 'relative';
            memberEl.style.display = 'flex';
            memberEl.style.alignItems = 'center';
            memberEl.style.backgroundColor = 'rgba(24, 24, 27, 0.7)';
            
            // Get role-specific styles
            const role = member.role || 'DPS';
            let roleColor, bgGradient, borderColor;
            
            if (role.toUpperCase() === 'TANK') {
              roleColor = '#66b3ff';
              bgGradient = 'linear-gradient(to right, rgba(102, 179, 255, 0.15), rgba(102, 179, 255, 0.05))';
              borderColor = 'rgba(102, 179, 255, 0.3)';
            } else if (role.toUpperCase() === 'HEALER') {
              roleColor = '#66ff66';
              bgGradient = 'linear-gradient(to right, rgba(102, 255, 102, 0.15), rgba(102, 255, 102, 0.05))';
              borderColor = 'rgba(102, 255, 102, 0.3)';
            } else {
              roleColor = '#ff6666';
              bgGradient = 'linear-gradient(to right, rgba(255, 102, 102, 0.15), rgba(255, 102, 102, 0.05))';
              borderColor = 'rgba(255, 102, 102, 0.3)';
            }
            
            // Apply the styles
            memberEl.style.border = `1px solid ${borderColor}`;
            memberEl.style.background = bgGradient;
            
            // Add the role indicator bar
            const roleBar = document.createElement('div');
            roleBar.style.position = 'absolute';
            roleBar.style.left = '0';
            roleBar.style.top = '0';
            roleBar.style.bottom = '0';
            roleBar.style.width = '4px';
            roleBar.style.backgroundColor = roleColor;
            roleBar.style.borderRadius = '8px 0 0 8px';
            memberEl.appendChild(roleBar);
            
            // Member content
            const contentContainer = document.createElement('div');
            contentContainer.style.marginLeft = '12px';
            contentContainer.style.flexGrow = '1';
            contentContainer.style.overflow = 'hidden';
            
            // Username
            const username = document.createElement('div');
            username.style.fontSize = '0.95rem';
            username.style.fontWeight = '500';
            username.style.color = 'white';
            username.style.whiteSpace = 'nowrap';
            username.style.overflow = 'hidden';
            username.style.textOverflow = 'ellipsis';
            username.textContent = member.User?.username || member.username;
            contentContainer.appendChild(username);
            
            // Role and spec
            const roleSpecContainer = document.createElement('div');
            roleSpecContainer.style.display = 'flex';
            roleSpecContainer.style.alignItems = 'center';
            
            const roleText = document.createElement('div');
            roleText.style.color = roleColor;
            roleText.style.fontSize = '0.8rem';
            roleText.style.fontWeight = '500';
            roleText.textContent = role;
            roleSpecContainer.appendChild(roleText);
            
            // Add weapon spec if available
            const primaryWeapon = member.selectedBuild?.primary || '';
            const secondaryWeapon = member.selectedBuild?.secondary || '';
            const weaponSpec = getWeaponSpec(primaryWeapon, secondaryWeapon);
            
            if (weaponSpec && weaponSpec !== 'Unknown') {
              // Dot separator
              const dot = document.createElement('div');
              dot.style.width = '4px';
              dot.style.height = '4px';
              dot.style.borderRadius = '50%';
              dot.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
              dot.style.margin = '0 5px';
              roleSpecContainer.appendChild(dot);
              
              // Spec text
              const specText = document.createElement('div');
              specText.style.color = 'rgba(255, 255, 255, 0.7)';
              specText.style.fontSize = '0.8rem';
              specText.textContent = weaponSpec;
              roleSpecContainer.appendChild(specText);
            }
            
            contentContainer.appendChild(roleSpecContainer);
            memberEl.appendChild(contentContainer);
            
            // Combat power if available
            if (member.combat_power) {
              const cpContainer = document.createElement('div');
              cpContainer.style.marginLeft = '1.5rem';
              cpContainer.style.padding = '0.5rem 1.5rem';
              cpContainer.style.borderRadius = '50px';
              cpContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
              cpContainer.style.border = '1px solid rgba(255, 215, 0, 0.3)';
              
              const cpText = document.createElement('div');
              cpText.style.color = '#ffd700';
              cpText.style.fontSize = '0.75rem';
              cpText.style.fontWeight = '600';
              cpText.textContent = `CP ${member.combat_power}`;
              
              cpContainer.appendChild(cpText);
              memberEl.appendChild(cpContainer);
            }
            
            membersContainer.appendChild(memberEl);
          });
        } else {
          const emptyMessage = document.createElement('div');
          emptyMessage.style.color = 'rgba(255, 255, 255, 0.5)';
          emptyMessage.style.textAlign = 'center';
          emptyMessage.style.padding = '20px';
          emptyMessage.textContent = 'Empty team';
          membersContainer.appendChild(emptyMessage);
        }
        
        teamElement.appendChild(membersContainer);
        gridContainer.appendChild(teamElement);
      });
      
      // Add the grid to the container
      screenshotContainer.appendChild(gridContainer);
      
      // Add to document
      document.body.appendChild(screenshotContainer);
      
      // Capture the screenshot
      const canvas = await html2canvas(screenshotContainer, {
        backgroundColor: '#121212',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      // Convert to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        try {
          // Try to use Clipboard API
          if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            setScreenshotSuccess({
              success: true,
              message: "Teams screenshot copied to clipboard!"
            });
          } else {
            // Fallback: create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'static-teams.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setScreenshotSuccess({
              success: true,
              message: "Teams screenshot downloaded (clipboard copy failed)"
            });
          }
        } catch (error) {
          console.error('Error copying to clipboard:', error);
          setScreenshotSuccess({
            success: false,
            message: "Failed to copy screenshot to clipboard"
          });
        }
      }, 'image/png', 0.9);
      
      // Clean up
      document.body.removeChild(screenshotContainer);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      setScreenshotSuccess({
        success: false,
        message: "Failed to capture screenshot: " + (error.message || "Unknown error")
      });
    } finally {
      setIsScreenshotting(false);
    }
  };

  // Team component
  const Team = ({ team, onDrop, onRemove, onRemoveMember, onEdit, canEdit }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [teamName, setTeamName] = useState(team.name);
    const [isDropTarget, setIsDropTarget] = useState(false);
  
    const handleDragOver = (e) => {
      e.preventDefault();
      if (!canEdit) return;
      e.dataTransfer.dropEffect = 'move';
      setIsDropTarget(true);
    };
    
    const handleDragLeave = () => {
      setIsDropTarget(false);
    };
  
    const handleDrop = (e) => {
      e.preventDefault();
      if (!canEdit) return;
      setIsDropTarget(false);
  
      let memberId;
      try {
        memberId = e.dataTransfer.getData('memberId');
        if (!memberId) {
          const jsonData = e.dataTransfer.getData('application/json');
          if (jsonData) {
            const data = JSON.parse(jsonData);
            memberId = data.id;
          }
        }
        if (!memberId) {
          memberId = e.dataTransfer.getData('text/plain');
        }
      } catch (err) {
        console.error('Error getting drag data:', err);
      }
      
      if (!memberId) {
        console.error('No member ID received in drop event');
        return;
      }
      
      onDrop(memberId, team.id);
    };
  
    // Calculate role distributions
    const roleCounts = {
      tank: team.members?.filter(m => m.role?.toUpperCase() === 'TANK').length || 0,
      healer: team.members?.filter(m => m.role?.toUpperCase() === 'HEALER').length || 0,
      dps: team.members?.filter(m => m.role?.toUpperCase() === 'DPS').length || 0
    };
  
    return (
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: isDropTarget ? 'rgba(30, 30, 40, 0.95)' : '#1e1e1e',
          border: isDropTarget 
            ? '2px dashed rgba(76, 175, 80, 0.6)' 
            : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isDropTarget 
            ? '0 0 20px rgba(76, 175, 80, 0.2)' 
            : '0 4px 20px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Team header */}
        <Box sx={{ 
          p: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'white',
              fontWeight: 600,
              cursor: canEdit ? 'pointer' : 'default',
              '&:hover': canEdit ? { color: '#90caf9' } : {}
            }}
            onClick={() => {
              if (canEdit) {
                setEditingTeam(team);
                setNewTeamName(team.name);
                setTeamDialogOpen(true);
              }
            }}
          >
            {team.name}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Role distribution indicators */}
            <Box sx={{ display: 'flex', mr: 2 }}>
              <Tooltip title={`${roleCounts.tank} Tanks`}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  height: 28,
                  borderRadius: '14px',
                  mr: 0.5,
                  backgroundColor: 'rgba(102, 179, 255, 0.2)',
                  border: '1px solid rgba(102, 179, 255, 0.3)'
                }}>
                  <ShieldIcon sx={{ color: '#66b3ff', fontSize: 16, mr: 0.5 }} />
                  <Typography sx={{ color: '#66b3ff', fontSize: '0.75rem', fontWeight: 600 }}>
                    {roleCounts.tank}
                  </Typography>
                </Box>
              </Tooltip>
              
              <Tooltip title={`${roleCounts.healer} Healers`}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  height: 28,
                  borderRadius: '14px',
                  mr: 0.5,
                  backgroundColor: 'rgba(102, 255, 102, 0.2)',
                  border: '1px solid rgba(102, 255, 102, 0.3)'
                }}>
                  <LocalHospitalIcon sx={{ color: '#66ff66', fontSize: 16, mr: 0.5 }} />
                  <Typography sx={{ color: '#66ff66', fontSize: '0.75rem', fontWeight: 600 }}>
                    {roleCounts.healer}
                  </Typography>
                </Box>
              </Tooltip>
              
              <Tooltip title={`${roleCounts.dps} DPS`}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  height: 28,
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 102, 102, 0.2)',
                  border: '1px solid rgba(255, 102, 102, 0.3)'
                }}>
                  <FlashOnIcon sx={{ color: '#ff6666', fontSize: 16, mr: 0.5 }} />
                  <Typography sx={{ color: '#ff6666', fontSize: '0.75rem', fontWeight: 600 }}>
                    {roleCounts.dps}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
            
            {canEdit && (
              <IconButton
                onClick={() => onRemove(team.id)}
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 68, 68, 0.2)',
                    color: '#ff4444'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        {/* Team members */}
        <Box sx={{ 
          p: 2, 
          flexGrow: 1,
          overflowY: 'auto',
          backgroundColor: isDropTarget ? 'rgba(76, 175, 80, 0.05)' : 'transparent'
        }}>
          {team.members?.length > 0 ? (
            team.members.map(member => (
              <DraggableMember 
                key={member.id || member.user_id || (member.User?.id)} 
                member={member} 
                onRemove={canEdit ? () => onRemoveMember(team.id, member) : null} 
                getRoleStyles={getRoleStyles}
              />
            ))
          ) : (
            <Box sx={{
              height: '100%',
              minHeight: 150,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: 1,
              p: 2
            }}>
              <Typography sx={{ 
                color: 'rgba(255, 255, 255, 0.5)',
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                {isDropTarget 
                  ? 'Drop member here' 
                  : 'Drag members here to add to the team'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // MemberPool component
  const MemberPool = ({ members, getRoleStyles }) => {
    // Group members by their build specs
    const roleGroups = {
      tank: members.filter(m => getMemberSpec(m) === 'Tank'),
      healer: members.filter(m => getMemberSpec(m) === 'Healer'),
      dps: members.filter(m => !['Tank', 'Healer'].includes(getMemberSpec(m)))
    };
  
    const roleIconMap = {
      tank: <ShieldIcon sx={{ fontSize: 20 }} />,
      healer: <LocalHospitalIcon sx={{ fontSize: 20 }} />,
      dps: <FlashOnIcon sx={{ fontSize: 20 }} />
    };
  
    const RoleCategoryHeader = ({ title, count, icon, color }) => (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1.5,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)'
      }}>
        <Box sx={{ 
          mr: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          color: color
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle1" sx={{ 
          color: 'white', 
          fontWeight: 600,
          fontSize: '1rem'
        }}>
          {title}
        </Typography>
        <Box sx={{
          ml: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: '50px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '0.75rem',
          fontWeight: 500
        }}>
          {count}
        </Box>
      </Box>
    );
  
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box 
          sx={{ 
            bgcolor: '#1e1e1e',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <RoleCategoryHeader 
            title="Tanks" 
            count={roleGroups.tank.length} 
            icon={roleIconMap.tank} 
            color="#66b3ff" 
          />
          <Box sx={{ p: 2, maxHeight: '300px', overflowY: 'auto' }}>
            {roleGroups.tank.length > 0 ? (
              roleGroups.tank.map(member => {
                // Create a new member object with combat role properly set
                const memberWithCombatRole = {
                  ...member,
                  // Set the role to TANK for display purposes
                  role: 'TANK'
                };
                
                return (
                  <DraggableMember 
                    key={member.id || member.user_id || (member.User?.id)} 
                    member={memberWithCombatRole}
                    getRoleStyles={getRoleStyles} 
                  />
                );
              })
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No tanks available
              </Typography>
            )}
          </Box>
        </Box>
  
        <Box 
          sx={{ 
            bgcolor: '#1e1e1e',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <RoleCategoryHeader 
            title="Healers" 
            count={roleGroups.healer.length} 
            icon={roleIconMap.healer} 
            color="#66ff66" 
          />
          <Box sx={{ p: 2, maxHeight: '300px', overflowY: 'auto' }}>
            {roleGroups.healer.length > 0 ? (
              roleGroups.healer.map(member => {
                // Create a new member object with combat role properly set
                const memberWithCombatRole = {
                  ...member,
                  // Set the role to HEALER for display purposes
                  role: 'HEALER'
                };
                
                return (
                  <DraggableMember 
                    key={member.id || member.user_id || (member.User?.id)} 
                    member={memberWithCombatRole}
                    getRoleStyles={getRoleStyles} 
                  />
                );
              })
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No healers available
              </Typography>
            )}
          </Box>
        </Box>
  
        <Box 
          sx={{ 
            bgcolor: '#1e1e1e',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <RoleCategoryHeader 
            title="DPS" 
            count={roleGroups.dps.length} 
            icon={roleIconMap.dps} 
            color="#ff6666" 
          />
          <Box sx={{ p: 2, maxHeight: '300px', overflowY: 'auto' }}>
            {roleGroups.dps.length > 0 ? (
              roleGroups.dps.map(member => {
                // Create a new member object with combat role properly set
                const memberWithCombatRole = {
                  ...member,
                  // Set the role to DPS for display purposes
                  role: 'DPS'
                };
                
                return (
                  <DraggableMember 
                    key={member.id || member.user_id || (member.User?.id)} 
                    member={memberWithCombatRole}
                    getRoleStyles={getRoleStyles} 
                  />
                );
              })
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No DPS available
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: 'white' }}>
            Static Teams
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {hasEditPermission() && (
              <>
                <Button
                  variant="contained"
                  onClick={() => {
                    setEditingTeam(null);
                    setNewTeamName('');
                    setTeamDialogOpen(true);
                  }}
                  startIcon={<AddIcon />}
                  sx={{
                    bgcolor: '#4CAF50',
                    '&:hover': { bgcolor: '#45a049' }
                  }}
                >
                  Create Team
                </Button>
                
                {/* Screenshot Teams button */}
                <Button
                  variant="contained"
                  onClick={captureTeamScreenshot}
                  disabled={isScreenshotting || teams.length === 0}
                  startIcon={<PhotoCameraIcon />}
                  sx={{
                    bgcolor: '#ff9800',
                    '&:hover': { bgcolor: '#ed8c00' },
                    '&.Mui-disabled': { bgcolor: 'rgba(255, 152, 0, 0.3)' }
                  }}
                >
                  {isScreenshotting ? 'Processing...' : 'Copy Teams Screenshot'}
                </Button>
                
                {/* Settings button (optional) */}
                <IconButton
                  sx={{ 
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Box>
    
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <MemberPool 
              members={members}
              getRoleStyles={getRoleStyles} 
            />
          </Grid>
    
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {/* Use a div with display:flex to make teams appear in a row */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
                {teams.map((team, index) => (
                  <Box 
                    key={team.id}
                    sx={{ 
                      width: { xs: '100%', md: '50%', lg: '33.333%' },
                      p: 1,
                      cursor: hasEditPermission() ? 'move' : 'default'
                    }}
                    draggable={hasEditPermission()}
                    onDragStart={(e) => {
                      if (!hasEditPermission()) return;
                      e.dataTransfer.setData('teamIndex', index.toString());
                    }}
                    onDragOver={(e) => {
                      if (!hasEditPermission()) return;
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!hasEditPermission()) return;
                      e.preventDefault();
                      const draggedIndex = parseInt(e.dataTransfer.getData('teamIndex'));
                      if (draggedIndex === index) return; // Same position, no change
                      
                      // Create a new teams array with the reordered teams
                      const newTeams = [...teams];
                      const draggedTeam = newTeams[draggedIndex];
                      
                      // Remove the dragged team
                      newTeams.splice(draggedIndex, 1);
                      
                      // Insert it at the new position
                      newTeams.splice(index, 0, draggedTeam);
                      
                      // Update state
                      setTeams(newTeams);
                    }}
                  >
                    <Team 
                      team={team} 
                      onDrop={handleDrop}
                      onRemove={handleDeleteTeam}
                      onRemoveMember={handleRemoveMember}
                      canEdit={hasEditPermission()}
                    />
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Grid>
    
        {/* Team Dialog */}
        <Dialog 
          open={teamDialogOpen} 
          onClose={() => setTeamDialogOpen(false)}
          PaperProps={{ sx: { bgcolor: '#1e1e1e' } }}
        >
          <DialogTitle sx={{ color: 'white' }}>
            {editingTeam ? 'Edit Team' : 'Create Team'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Team Name"
              fullWidth
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              sx={{
                '& .MuiInputBase-input': { color: 'white' },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTeamDialogOpen(false)} sx={{ color: 'white' }}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingTeam ? handleUpdateTeam(editingTeam) : handleCreateTeam()}
              variant="contained"
              sx={{
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              {editingTeam ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
    
        {/* Build Selection Dialog */}
        <BuildSelectionDialog
          open={buildDialogOpen}
          member={selectedMember}
          onClose={() => {
            setBuildDialogOpen(false);
            setSelectedMember(null);
          }}
          onSelectBuild={handleBuildChange}
        />
    
        {/* Screenshot notification */}
        <Snackbar 
          open={screenshotSuccess !== null} 
          autoHideDuration={6000} 
          onClose={() => setScreenshotSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setScreenshotSuccess(null)} 
            severity={screenshotSuccess?.success ? "success" : "error"}
            sx={{ width: '100%' }}
          >
            {screenshotSuccess?.message}
          </Alert>
        </Snackbar>
        
        {/* Error notification */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setError(null)} 
            severity="error"
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </DndProvider>
  );
};

export default StaticTeams;