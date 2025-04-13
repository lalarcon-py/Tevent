import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Snackbar,
  MenuItem
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
  
  // Store member ID for comparison to detect changes
  const memberIdRef = React.useRef(member?.user_id || member?.id || member?.User?.id);
  
  React.useEffect(() => {
    const currentEl = dragRef.current;
    if (!currentEl) return;
    
    // Track if we're in the middle of a drag operation
    let isDragging = false;
    
    const handleDragStart = (e) => {
      // Prevent starting a new drag while one is in progress
      if (isDragging) {
        e.preventDefault();
        return;
      }
      
      console.log('Drag started!');
      const memberId = member.user_id || member.id || (member.User?.id);
      
      if (!memberId) {
        console.error('No valid ID found for member:', member);
        e.preventDefault();
        return;
      }
      
      console.log('Setting drag data with ID:', memberId);
      
      try {
        // Set the primary data
        e.dataTransfer.setData('text/plain', memberId);
        e.dataTransfer.setData('memberId', memberId);
        
        // Set a custom format instead of duplicating 'text/plain'
        e.dataTransfer.setData('application/x-member-id', memberId);
        
        // Set the drag image to the current element to avoid flicker
        e.dataTransfer.setDragImage(currentEl, 20, 20);
        
        isDragging = true;
        currentEl.classList.add('dragging');
      } catch (err) {
        console.error('Error setting drag data:', err);
        e.preventDefault();
      }
    };
    
    const handleDragEnd = () => {
      currentEl.classList.remove('dragging');
      isDragging = false;
      
      // Add a small delay to ensure the element is ready for the next drag
      setTimeout(() => {
        currentEl.style.opacity = 1;
      }, 100);
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
  
  // Update memberIdRef when it changes
  React.useEffect(() => {
    const currentMemberId = member?.user_id || member?.id || member?.User?.id;
    if (currentMemberId !== memberIdRef.current) {
      memberIdRef.current = currentMemberId;
    }
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
      role="button"
      aria-label={`Drag ${member.User?.username || member.username}`}
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

// Simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Static Teams Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: '#ff6666', mb: 2 }}>
            Something went wrong with the Static Teams component.
          </Typography>
          <Typography sx={{ color: 'white', mb: 2 }}>
            Please try refreshing the page. If the problem persists, contact support.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mr: 2 }}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Wrap components with error safe rendering
const SafeRender = ({ children, fallback = null }) => {
  try {
    return children;
  } catch (error) {
    console.error('Render error caught:', error);
    return fallback;
  }
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
  const [eventContext, setEventContext] = useState('Main Event');
  const [availableContexts, setAvailableContexts] = useState([
    'Main Event', 'Inter-server', 'War Game', 'BoonStone', 'Riftstone', 'Archboss', 'Peace Boss'
  ]);
  const [selectedContext, setSelectedContext] = useState('All Teams');
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [editingContext, setEditingContext] = useState('');
  const [newContextName, setNewContextName] = useState('');
  const [assignedMembersByContext, setAssignedMembersByContext] = useState({
    'Main Event': new Set(),
    'Inter-server': new Set(),
    'War Game': new Set(),
    'BoonStone': new Set(),
    'Riftstone': new Set(),
    'Archboss': new Set(),
    'Peace Boss': new Set()
  });
  
  // Filter members that aren't already in a team of the selected context
  const filteredMembers = useMemo(() => {
    // Safeguard against empty/undefined members array
    if (!members || !Array.isArray(members)) return [];
  
    // Safeguard against empty/undefined assignedMembersByContext
    const safeAssignedMembersByContext = assignedMembersByContext || {};
  
    if (!selectedContext || selectedContext === 'All Teams') {
      // If viewing all teams, show all members
      // Each member can be in multiple teams (one per event type)
      return members.filter(member => {
        if (!member) return false;
        const memberId = member.user_id || member.id || (member.User?.id);
        return !!memberId; // Just filter out members without IDs
      });
    } else {
      // When viewing a specific context, show members not assigned to that context
      const assignedIds = safeAssignedMembersByContext[selectedContext] || new Set();
      return members.filter(member => {
        if (!member) return false;
        const memberId = member.user_id || member.id || (member.User?.id);
        return memberId && !assignedIds.has(memberId);
      });
    }
  }, [members, selectedContext, assignedMembersByContext]);

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
          
          // Ensure teams array has valid data
          // Make sure event_context is set for each team
          const validTeams = fetchedTeams
            .filter(team => team && typeof team === 'object')
            .map(team => ({
              ...team,
              event_context: team.event_context || 'Main Event',
              members: Array.isArray(team.members) ? team.members : []
            }));
          
          setTeams(validTeams);
          
          // Get unique event contexts
          // Fetch event contexts from API
          try {
            const contextsResponse = await axiosInstance.get(`/api/static-teams/event-contexts?guildId=${guildId}`);
            if (contextsResponse.status === 200) {
              // Ensure we have array data
              const apiContexts = Array.isArray(contextsResponse.data) ? contextsResponse.data : [];
                
              // Filter out any undefined or null values
              const validApiContexts = apiContexts.filter(context => context && typeof context === 'string');
                
              // Merge with our default contexts
              const defaults = ['Main Event', 'Inter-server', 'War Game', 'BoonStone', 'Riftstone', 'Archboss', 'Peace Boss'];
              const allContexts = [...new Set([...validApiContexts, ...defaults])];
              setAvailableContexts(allContexts);
            }
          } catch (contextsError) {
            console.error('Error fetching event contexts:', contextsError);
            // Fallback to contexts from teams
            const contexts = [...new Set(validTeams.map(team => team.event_context || 'Main Event'))];
            if (contexts.length > 0) {
              // Merge with default contexts, removing duplicates
              const allContexts = [...new Set([...contexts, ...availableContexts])];
              setAvailableContexts(allContexts);
            }
          }
          
          // Collect all member IDs already assigned to teams, organized by event context
          const assignedByContext = {};
          validTeams.forEach(team => {
            const context = team.event_context || 'Main Event';
            if (!assignedByContext[context]) {
              assignedByContext[context] = new Set();
            }
            
            if (team && Array.isArray(team.members)) {
              team.members.forEach(member => {
                if (member) {
                  const memberId = member.user_id || member.id || (member.User?.id);
                  if (memberId) {
                    assignedByContext[context].add(memberId);
                  }
                }
              });
            }
          });
          
          // Update the state with the collected data
          setAssignedMembersByContext(assignedByContext);
  
          try {
            // Fetch all guild members
            const membersResponse = await axiosInstance.get(`/api/guilds/${guildId}/members`);
            if (membersResponse.status === 200 && Array.isArray(membersResponse.data)) {
              // Process members to ensure they have the correct structure
              // Unlike before, we don't filter out all assigned members, we'll filter by context later
              const processedMembers = membersResponse.data
                .filter(member => member !== null && typeof member === 'object') // Filter out null or invalid member entries
                .map(formatMemberWithBuilds);
                
              setMembers(processedMembers);
            }
          } catch (memberError) {
            console.error('Error fetching guild members:', memberError);
            setError('Failed to load guild members');
          }
        }
      } catch (error) {
        console.error('Error fetching static teams:', error);
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
        guildId,
        event_context: eventContext
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
        guildId,
        event_context: eventContext
      });

      if (response.status === 200) {
        // Make sure we don't try to update an undefined team
        const safeTeams = Array.isArray(teams) ? teams : [];
        const updatedTeams = safeTeams.map(t => {
          if (!t || typeof t !== 'object') return t;
          return t.id === team.id ? { ...t, name: newTeamName, event_context: eventContext } : t;
        });
        
        setTeams(updatedTeams);
        setTeamDialogOpen(false);
        setNewTeamName('');
        setEventContext('Main Event');
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
      // Safeguard against undefined teams
      if (!teams || !Array.isArray(teams)) {
        console.error('Teams array is not valid');
        return;
      }
      
      // Find the target team
      const targetTeam = teams.find(t => t && typeof t === 'object' && t.id === teamId);
      if (!targetTeam) {
        console.error('Target team not found:', teamId);
        return;
      }
      
      // Define a default event context if it's not set
      const targetEventContext = targetTeam.event_context || 'Main Event';

      // Find the member
      let member = members.find(m => 
        m.id === memberId || m.user_id === memberId || 
        (m.User && m.User.id === memberId)
      );
      
      let sourceTeamId = null;
      let sourceTeam = null;

      // If not found in available members, check teams
      if (!member) {
        for (const team of teams) {
        if (!team || typeof team !== 'object' || !team.members) continue;
          
          const foundMember = team.members.find(m => 
            m.id === memberId || m.user_id === memberId || 
            (m.User && m.User.id === memberId)
          );
          
          if (foundMember) {
            member = foundMember;
            sourceTeamId = team.id;
            sourceTeam = team;
            break;
          }
        }
      }

      if (!member) {
        console.error('Member not found:', memberId);
        return;
      }

      // Check if this is a move within the same team
      if (sourceTeamId === teamId) {
        return; // Same team, no change needed
      }

      // Check if the member is already in a team of the same event context
      let sameContextTeamId = null;
      if (sourceTeam && (sourceTeam?.event_context || 'Main Event') !== targetEventContext) {
        // Moving between different event contexts, check if already in a team of target context
        for (const team of teams) {
          if (!team || typeof team !== 'object') continue; // Skip undefined or null teams
          if (team.id === teamId) continue; // Skip target team
          if ((team?.event_context || 'Main Event') !== targetEventContext) continue; // Skip different contexts
          
          const foundInContextTeam = team.members?.some(m => 
            m.id === memberId || m.user_id === memberId || 
            (m.User && m.User.id === memberId)
          );
          
          if (foundInContextTeam) {
            sameContextTeamId = team.id;
            break;
          }
        }
      } else if (!sourceTeam) {
        // Check if already in any team of this context
        for (const team of teams) {
          if (!team || typeof team !== 'object') continue; // Skip undefined or null teams
          if (team.id === teamId) continue; // Skip target team
          if ((team?.event_context || 'Main Event') !== targetEventContext) continue; // Skip different contexts
          
          const foundInContextTeam = team.members?.some(m => 
            m.id === memberId || m.user_id === memberId || 
            (m.User && m.User.id === memberId)
          );
          
          if (foundInContextTeam) {
            sameContextTeamId = team.id;
            sourceTeamId = team.id; // Set as source for removal
            break;
          }
        }
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
      
      // Create copies of current state for manipulation
      const updatedTeams = [...teams];
      const updatedMembers = [...members];
      
      // Find target team
      const targetTeamIndex = updatedTeams.findIndex(t => t && t.id === teamId);
      if (targetTeamIndex === -1) {
        console.error('Target team not found:', teamId);
        return;
      }
      
      // Prepare the member object to add to the target team
      const memberToAdd = {
        ...member,
        role: role,
        selectedBuild: selectedBuild,
        selected_build: selectedBuild
      };
      
      // Handle removal from source team (if same context or explicit source)
      if (sameContextTeamId || sourceTeamId) {
        // Find the team to remove from
        const removeFromTeamId = sameContextTeamId || sourceTeamId;
        const sourceTeamIndex = updatedTeams.findIndex(t => t && t.id === removeFromTeamId);
        
        if (sourceTeamIndex >= 0) {
          // Remove member from source team
          updatedTeams[sourceTeamIndex] = {
            ...updatedTeams[sourceTeamIndex],
            members: updatedTeams[sourceTeamIndex].members?.filter(m => 
              m.id !== memberId && 
              m.user_id !== memberId && 
              (m.User?.id !== memberId)
            ) || []
          };
        }
      }

      // Add member to target team
      updatedTeams[targetTeamIndex] = {
        ...updatedTeams[targetTeamIndex],
        members: [
          ...(updatedTeams[targetTeamIndex].members || []),
          memberToAdd
        ]
      };

      // If member was in available pool (not in any team), remove them
      if (!sourceTeamId && !sameContextTeamId) {
        const memberIndex = updatedMembers.findIndex(m => 
          m.id === memberId || 
          m.user_id === memberId || 
          (m.User?.id === memberId)
        );
        
        if (memberIndex >= 0) {
          updatedMembers.splice(memberIndex, 1);
        }
        
        // Update members state
        setMembers(updatedMembers);
      }
      
      // Force a fresh render of the entire component by creating a deep copy
      const deepCopiedTeams = JSON.parse(JSON.stringify(updatedTeams));
      setTeams(deepCopiedTeams);

      // Update assignedMembersByContext
      const updatedAssignedMembersByContext = { ...assignedMembersByContext };
      
      // Add member to new context
      if (typeof targetEventContext === 'string') {
        // Ensure context exists
        if (!updatedAssignedMembersByContext[targetEventContext]) {
          updatedAssignedMembersByContext[targetEventContext] = new Set();
        }
        // Add member to context
        if (userId) {
          updatedAssignedMembersByContext[targetEventContext].add(userId);
        }
      }
      
      // Update state
      setAssignedMembersByContext(updatedAssignedMembersByContext);

      // Now make the API call after UI has been updated
      const response = await axiosInstance.post(`/api/static-teams/${teamId}/members`, {
        memberId: userId,
        role: role,
        sourceTeamId: sameContextTeamId || sourceTeamId,
        guildId,
        selectedBuild
      });

      if (response.status !== 200) {
        throw new Error('Failed to update team member');
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      setError('Failed to update team');
      
      // If an error occurs, refresh data to restore correct state
      if (guildId) {
        const refreshData = async () => {
          try {
            // Fetch static teams
            const teamsResponse = await axiosInstance.get(`/api/static-teams?guildId=${guildId}`);
            if (teamsResponse.status === 200) {
              setTeams(teamsResponse.data || []);
              
              // Fetch all guild members
              const membersResponse = await axiosInstance.get(`/api/guilds/${guildId}/members`);
              if (membersResponse.status === 200) {
                setMembers(membersResponse.data.map(formatMemberWithBuilds));
              }
            }
          } catch (refreshError) {
            console.error('Error refreshing data after failure:', refreshError);
          }
        };
        
        refreshData();
      }
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
        
        // Update assignedMembersByContext
        const team = teams.find(t => t.id === teamId);
        if (team && typeof team === 'object') {
          const context = team.event_context || 'Main Event';
          
          // Make a proper copy of the state with Sets
          const updatedAssignedMembersByContext = {};
          
          // Copy all sets from the existing state
          Object.keys(assignedMembersByContext).forEach(key => {
            if (assignedMembersByContext[key] instanceof Set) {
              updatedAssignedMembersByContext[key] = new Set(assignedMembersByContext[key]);
            } else {
              updatedAssignedMembersByContext[key] = new Set();
            }
          });
          
          // Remove the member from the context
          if (updatedAssignedMembersByContext[context] && userId) {
            updatedAssignedMembersByContext[context].delete(userId);
            setAssignedMembersByContext(updatedAssignedMembersByContext);
          }
        }
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
    const [teamName, setTeamName] = useState(team?.name || '');
    const [isDropTarget, setIsDropTarget] = useState(false);
    const [isProcessingDrop, setIsProcessingDrop] = useState(false);
    const teamRef = React.useRef(team);
    
    // Update team name state when team changes
    React.useEffect(() => {
      if (team?.name !== teamName) {
        setTeamName(team?.name || '');
      }
      teamRef.current = team;
    }, [team]);
  
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
      if (!canEdit || isProcessingDrop) return;
      setIsDropTarget(false);
      setIsProcessingDrop(true);
  
      let memberId;
      try {
        // Try all possible data formats
        memberId = e.dataTransfer.getData('memberId');
        
        if (!memberId) {
          memberId = e.dataTransfer.getData('application/x-member-id');
        }
        
        if (!memberId) {
          memberId = e.dataTransfer.getData('text/plain');
        }
        
        if (!memberId) {
          const jsonData = e.dataTransfer.getData('application/json');
          if (jsonData) {
            try {
              const data = JSON.parse(jsonData);
              memberId = data.id;
            } catch (parseErr) {
              console.error('Error parsing JSON data:', parseErr);
            }
          }
        }
      } catch (err) {
        console.error('Error getting drag data:', err);
        setIsProcessingDrop(false);
        return;
      }
      
      if (!memberId) {
        console.error('No member ID received in drop event');
        setIsProcessingDrop(false);
        return;
      }
      
      console.log('Processing drop of member', memberId, 'to team', team.id);
      
      // Process the drop with a delay to ensure DOM is ready
      // This helps prevent the team from disappearing
      requestAnimationFrame(() => {
        onDrop(memberId, team.id);
        
        // Reset the processing state after a short delay
        setTimeout(() => {
          setIsProcessingDrop(false);
        }, 300);
      });
    };
  
    // Calculate role distributions with extra safeguards
    const roleCounts = {
    tank: Array.isArray(team?.members) ? team.members.filter(m => m && m.role && m.role.toUpperCase() === 'TANK').length : 0,
    healer: Array.isArray(team?.members) ? team.members.filter(m => m && m.role && m.role.toUpperCase() === 'HEALER').length : 0,
    dps: Array.isArray(team?.members) ? team.members.filter(m => m && m.role && m.role.toUpperCase() === 'DPS').length : 0
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
                setEventContext(team.event_context || 'Main Event');
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
          <Box>
            <Typography variant="h4" sx={{ color: 'white' }}>
              Static Teams
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {hasEditPermission() && (
              <>
                <Button
                  variant="contained"
                  onClick={() => {
                    setEditingTeam(null);
                    setNewTeamName('');
                    setEventContext('Main Event');
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
            members={filteredMembers}
            getRoleStyles={getRoleStyles} 
            />
          </Grid>
    
          <Grid item xs={12} md={9}>
            {/* Teams type selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 1 }}>
              <Typography variant="body1" sx={{ color: 'white', mr: 2 }}>
                View teams by type:
              </Typography>
              <TextField
                select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 200,
                  '& .MuiInputBase-root': {
                    color: 'white',
                    backgroundColor: 'rgba(30, 30, 40, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)'
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'rgba(255, 255, 255, 0.7)'
                  },
                  '& .MuiSelect-select': {
                    paddingY: '8px'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main'
                  }
                }}
              >
                <MenuItem value="All Teams">All Teams</MenuItem>
                {availableContexts.map(context => (
                  <MenuItem key={context} value={context}>{context}</MenuItem>
                ))}
              </TextField>
              {hasEditPermission() && (
                <Button 
                  sx={{ ml: 2, textTransform: 'none' }}
                  onClick={() => {
                    setContextDialogOpen(true);
                  }}
                >
                  Manage Types
                </Button>
              )}
            </Box>
            
            {/* Group teams by event context */}
            <SafeRender fallback={
              <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: 2 }}>
                <Typography sx={{ color: 'white' }}>Error rendering teams. Please try again.</Typography>
              </Box>
            }>
              {teams && Array.isArray(teams) && teams.length > 0 ? (
              // If All Teams is selected, show all contexts
              // Otherwise filter to just show the selected context
              (selectedContext === 'All Teams' ? availableContexts : [selectedContext]).map(context => {
                if (!context) return null; // Skip if context is undefined
                
                // Filter teams for this context - ensure we only filter defined team objects
                const contextTeams = teams.filter(team => {
                  if (!team || typeof team !== 'object') return false;
                  const teamContext = team.event_context || 'Main Event';
                  return teamContext === context;
                });
                
                if (!contextTeams || contextTeams.length === 0) return null;
                
                return (
                  <Box key={`context-${context}`} sx={{ mb: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 1,
                      px: 1 
                    }}>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {context}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {contextTeams.length} team{contextTeams.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={2}>
                      {/* Use a div with display:flex to make teams appear in a row */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
                        {contextTeams.filter(team => team && typeof team === 'object').map((team, index) => (
                  <Box 
                    key={`team-container-${team.id}`}
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
                    {/* Force Team component to re-render by providing a unique key when members change */}
                    <Team 
                      key={`team-${team.id}-members-${team.members?.length || 0}`}
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
                  </Box>
                );
              })
            ) : (
            <Box sx={{ width: '100%', p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            No teams available. Create a team to get started.
            </Typography>
            </Box>
            )}
            </SafeRender>
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
                },
                mb: 2
              }}
            />
            <Box sx={{ bgcolor: '#333', p: 1, borderRadius: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                Team Type
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableContexts.map((context) => (
                  <Box
                    key={context}
                    onClick={() => setEventContext(context)}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: '50px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      bgcolor: eventContext === context ? 'primary.main' : 'rgba(255, 255, 255, 0.1)',
                      color: eventContext === context ? 'white' : 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        bgcolor: eventContext === context ? 'primary.dark' : 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    {context}
                  </Box>
                ))}
              </Box>
            </Box>
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
    
        {/* Context management dialog */}
        <Dialog 
          open={contextDialogOpen} 
          onClose={() => setContextDialogOpen(false)}
          PaperProps={{ sx: { bgcolor: '#1e1e1e', maxWidth: '500px' } }}
        >
          <DialogTitle sx={{ color: 'white' }}>
            Manage Team Types
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Rename team types or add new ones.
            </Typography>
            
            <List sx={{ mb: 2 }}>
              {availableContexts.map(context => (
                <ListItem 
                  key={context}
                  sx={{ 
                    borderRadius: 1, 
                    mb: 1, 
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                  }}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                      onClick={() => {
                        setEditingContext(context);
                        setNewContextName(context);
                      }}
                    >
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText 
                    primary={
                      <Typography sx={{ color: 'white' }}>{context}</Typography>
                    }
                    secondary={
                      <SafeRender fallback={<Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>0 teams</Typography>}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {Array.isArray(teams) ? teams.filter(team => team && typeof team === 'object' && (team.event_context || 'Main Event') === context).length : 0} teams
                        </Typography>
                      </SafeRender>
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                placeholder="New Team Type"
                variant="outlined"
                size="small"
                fullWidth
                value={editingContext ? newContextName : ''}
                onChange={(e) => setNewContextName(e.target.value)}
                sx={{
                  '& .MuiInputBase-input': { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                  }
                }}
              />
              <Button 
                variant="contained" 
                sx={{ ml: 1 }}
                disabled={!newContextName.trim() || (editingContext && newContextName.trim() === editingContext)}
                onClick={() => {
                  if (editingContext) {
                    // Call API to rename context
                    axiosInstance.put(`/api/static-teams/event-contexts/${encodeURIComponent(editingContext)}`, {
                      newContext: newContextName,
                      guildId
                    }).then(response => {
                      if (response.status === 200) {
                        // Update all teams with this context
                        const updatedTeams = teams.map(team => {
                          if ((team.event_context || 'Main Event') === editingContext) {
                            return { ...team, event_context: newContextName };
                          }
                          return team;
                        });
                        
                        // Update availableContexts
                        const updatedContexts = availableContexts.map(c => 
                          c === editingContext ? newContextName : c
                        );
                        
                        setTeams(updatedTeams);
                        setAvailableContexts(updatedContexts);
                        
                        // If we're currently viewing the renamed context, update selected context
                        if (selectedContext === editingContext) {
                          setSelectedContext(newContextName);
                        }
                      } else {
                        setError('Failed to update team type');
                      }
                    }).catch(error => {
                      console.error('Error updating team type:', error);
                      setError('Failed to update team type: ' + (error.message || 'Unknown error'));
                    }).finally(() => {
                      // Reset form
                      setEditingContext('');
                      setNewContextName('');
                    });
                  } else {
                    // Add new context
                    setAvailableContexts([...availableContexts, newContextName]);
                    setNewContextName('');
                  }
                }}
              >
                {editingContext ? 'Update' : 'Add'}
              </Button>
              {editingContext && (
                <Button 
                  sx={{ ml: 1 }}
                  onClick={() => {
                    setEditingContext('');
                    setNewContextName('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContextDialogOpen(false)} sx={{ color: 'white' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
        
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

// Wrap the StaticTeams component with the ErrorBoundary
const SafeStaticTeams = () => (
  <ErrorBoundary>
    <StaticTeams />
  </ErrorBoundary>
);

export default SafeStaticTeams;