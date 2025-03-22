// src/components/TeamPlanner/TeamPlanner.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactDOM from 'react-dom';
import html2canvas from 'html2canvas';
import { 
  Box, 
  Typography, 
  Paper, 
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
  IconButton 
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useSimulatedRole } from '../../contexts/SimulatedRoleContext';
import ShieldIcon from '@mui/icons-material/Shield';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DoNotDisturbAltIcon from '@mui/icons-material/DoNotDisturbAlt';
import DeleteIcon from '@mui/icons-material/Delete';

const API_URL = process.env.REACT_APP_API_URL;

const logEvent = (eventName, eventData) => {
  console.log(`[TeamPlanner] ${eventName}:`, eventData);
};

// Utility functions for build storage
const storeBuildSelection = (eventId, userId, role, buildIndex, buildData) => {
  try {
    if (!eventId || !userId) return;
    
    const storageKey = `event_${eventId}_build_selections`;
    
    // Get existing selections
    let selections = {};
    const existingData = localStorage.getItem(storageKey);
    if (existingData) {
      try {
        selections = JSON.parse(existingData);
      } catch (e) {
        console.error('Error parsing stored build selections:', e);
        selections = {};
      }
    }
    
    // Store this user's selection with full build data
    selections[userId] = { 
      role, 
      buildIndex,
      // Store key weapon data to avoid relying on component state
      primaryWeapon: buildData?.primary || '',
      secondaryWeapon: buildData?.secondary || '',
      spec: buildData?.spec || ''
    };
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(selections));
    
    console.log(`Stored build selection for user ${userId} in event ${eventId}: ${role}, buildIndex ${buildIndex}`);
  } catch (error) {
    console.error('Error storing build selection:', error);
  }
};

const getStoredBuildSelection = (eventId, userId) => {
  try {
    if (!eventId || !userId) return null;
    
    const storageKey = `event_${eventId}_build_selections`;
    const existingData = localStorage.getItem(storageKey);
    
    if (existingData) {
      try {
        const selections = JSON.parse(existingData);
        return selections[userId] || null;
      } catch (e) {
        console.error('Error parsing stored build selections:', e);
      }
    }
  } catch (error) {
    console.error('Error retrieving build selection:', error);
  }
  
  return null;
};

// Weapon Specs mapping
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

// Build Selection Dialog Component
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
          Please select which build you want to use for this event:
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

const DraggableMember = ({ member, onRemove, getRoleStyles }) => {
  const { eventId } = useParams();
  const dragRef = React.useRef(null);
  
  React.useEffect(() => {
    const currentEl = dragRef.current;
    if (!currentEl) return;
    
    const handleDragStart = (e) => {
      console.log('Drag started!');
      const memberId = member.user_id || member.id || (member.User?.id);
      
      if (!memberId) {
        console.error('No valid ID found for member:', member);
        e.preventDefault();
        return;
      }
      
      console.log('Setting drag data with ID:', memberId);

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
  
  console.log('Member in DraggableMember:', {
    id: member.id || member.user_id,
    role: member.role,
    hasSelectedBuild: !!member.selected_build
  });

  // Prioritize selected_build
  let activeBuild = null;
  
  // First try to use selected_build
  if (member.selected_build) {
    activeBuild = member.selected_build;
    console.log('Using selected_build:', activeBuild);
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
  
  // Get role-specific styling - using the component-level function
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

// Main TeamPlanner component
const TeamPlanner = () => {
  const { eventId } = useParams();
  const { simulatedRole } = useSimulatedRole();
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState([]);
  const [openPresetDialog, setOpenPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [guildId, setGuildId] = useState(null);
  const [absentees, setAbsentees] = useState([]);
  const [isAnnouncingTeams, setIsAnnouncingTeams] = useState(false);
  const [announceSuccess, setAnnounceSuccess] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [deletePresetDialog, setDeletePresetDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  // Helper function to determine if user has permission to edit teams
  const hasEditPermission = () => {
    // Get effective role (simulated or actual)
    const effectiveRole = simulatedRole || userRole;
    
    // Only Guild Master, Guild Advisor, and Guild Guardian can edit teams
    return ['Guild Master', 'Guild Advisor', 'Guild Guardian'].includes(effectiveRole);
  };

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
    if (roleUpper === 'TENTATIVE') {
      return {
        color: '#ffcc66',
        bgGradient: 'linear-gradient(to right, rgba(255, 204, 102, 0.15), rgba(255, 204, 102, 0.05))',
        borderColor: 'rgba(255, 204, 102, 0.3)'
      };
    }
    if (roleUpper === 'ABSENT') {
      return {
        color: '#aaaaaa',
        bgGradient: 'linear-gradient(to right, rgba(170, 170, 170, 0.15), rgba(170, 170, 170, 0.05))',
        borderColor: 'rgba(170, 170, 170, 0.3)'
      };
    }
    
    return { color: 'white', bgGradient: 'linear-gradient(to right, #2c2c2c, #1a1a1a)' };
  };

  // New function to capture and send team screenshots
  const captureAndSendTeamImages = async () => {
    if (teams.length === 0) return;
    
    setIsAnnouncingTeams(true); // Reuse the loading state
    
    try {
      // Create an array to store image data
      const teamImages = [];
      
      // For each team, create a temporary clone without edit controls
      for (const team of teams) {
        // Create a container reference for the team
        const teamRef = document.createElement('div');
        teamRef.style.position = 'absolute';
        teamRef.style.left = '-9999px';
        document.body.appendChild(teamRef);
        
        // Render the team without edit controls
        ReactDOM.render(
          <Box sx={{ 
            p: 2,
            width: '500px', // Fixed width for consistency
            bgcolor: '#1e1e1e',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}>
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
                  fontWeight: 600
                }}
              >
                {team.name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Role distribution indicators */}
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title={`${team.members.filter(m => m.role?.toUpperCase() === 'TANK').length} Tanks`}>
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
                        {team.members.filter(m => m.role?.toUpperCase() === 'TANK').length}
                      </Typography>
                    </Box>
                  </Tooltip>
                  
                  <Tooltip title={`${team.members.filter(m => m.role?.toUpperCase() === 'HEALER').length} Healers`}>
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
                        {team.members.filter(m => m.role?.toUpperCase() === 'HEALER').length}
                      </Typography>
                    </Box>
                  </Tooltip>
                  
                  <Tooltip title={`${team.members.filter(m => m.role?.toUpperCase() === 'DPS').length} DPS`}>
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
                        {team.members.filter(m => m.role?.toUpperCase() === 'DPS').length}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
            
            {/* Team members */}
            <Box sx={{ p: 2 }}>
              {team.members?.map(member => {
                // Get role styling for this member
                const roleStyles = getRoleStyles(member.role);
                
                // Get build info and weapon spec
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
                      builds = [];
                    }
                  } else if (member.builds && typeof member.builds === 'string') {
                    try {
                      builds = JSON.parse(member.builds);
                    } catch (e) {
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
                const memberWeaponSpec = getWeaponSpec(primaryWeapon, secondaryWeapon);
                
                return (
                  <Box 
                    key={member.id || member.user_id || (member.User?.id)}
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
                    
                    {/* Weapon icons */}
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
                        
                        {memberWeaponSpec && memberWeaponSpec !== 'Unknown' && (
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
                              {memberWeaponSpec}
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
                  </Box>
                );
              })}
            </Box>
          </Box>,
          teamRef
        );
        
        // Use html2canvas to capture the rendered team
        const canvas = await html2canvas(teamRef.firstChild, {
          backgroundColor: '#1e1e1e',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true
        });
        
        // Convert to image data
        const imageData = canvas.toDataURL('image/png');
        teamImages.push({
          name: team.name,
          image: imageData
        });
        
        // Clean up
        document.body.removeChild(teamRef);
      }
      
      // Send the images to the server
      const response = await fetch(`${API_URL}/api/discord-bot/announce-teams-with-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          guildId,
          teams: teams.map(team => ({
            id: team.id,
            name: team.name,
            members: team.members.map(member => ({
              id: member.user_id || member.id || (member.User?.id),
              username: member.User?.username || member.username,
              role: member.role
            }))
          })),
          teamImages
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send team screenshots');
      }
      
      setAnnounceSuccess({
        success: true,
        message: "Teams announced with screenshots to Discord!"
      });
    } catch (error) {
      console.error('Error capturing or sending team screenshots:', error);
      setAnnounceSuccess({
        success: false,
        message: error.message || 'Failed to send team screenshots'
      });
    } finally {
      setIsAnnouncingTeams(false);
    }
  };

  const handleEditTeam = async (updatedTeam) => {
    if (!hasEditPermission()) {
      setError('You do not have permission to edit teams');
      return;
    }
    
    try {
      // Call API to update team name
      const response = await fetch(`${API_URL}/api/teams/${updatedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: updatedTeam.name,
          guildId: guildId
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team');
      }
  
      // Update team name in state
      setTeams(prev => prev.map(team =>
        team.id === updatedTeam.id ? { ...team, name: updatedTeam.name } : team
      ));
      
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team name');
    }
  };


  const getParticipantSpec = (participant) => {
    if (!participant) return 'Unknown';
    
    // First check if there's an event-specific selected build
    if (participant.selected_build || participant.selectedBuild) {
      let selectedBuild = participant.selected_build || participant.selectedBuild;
      if (typeof selectedBuild === 'string') {
        try {
          selectedBuild = JSON.parse(selectedBuild);
          if (selectedBuild.spec) return selectedBuild.spec;
        } catch (e) {
          console.error('Error parsing selected_build:', e);
        }
      } else if (selectedBuild && selectedBuild.spec) {
        return selectedBuild.spec;
      }
    }
    
    // Try User.builds first, then direct builds
    let builds = participant.User?.builds || participant.builds;
    
    // If builds is a string, try to parse it
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
    
    // If we have at least one build, return its spec
    if (builds.length > 0 && builds[0]?.spec) {
      return builds[0].spec;
    }
    
    // For TANK, HEALER, DPS role values (from API)
    if (participant.role) {
      const role = participant.role.toUpperCase();
      if (role === 'TANK') return 'Tank';
      if (role === 'HEALER') return 'Healer';
      if (role === 'DPS') return 'DPS';
    }
    
    // Default return
    return 'Unknown';
  };

  // Fetch guild ID
  useEffect(() => {
    const fetchGuildId = async () => {
      try {
        const response = await fetch(`${API_URL}/api/guilds/my-guilds`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const guilds = await response.json();
          if (guilds.length > 0) {
            setGuildId(guilds[0].id);
            console.log('Using guild ID for team planner:', guilds[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching guild ID:', error);
      }
    };
    
    fetchGuildId();
  }, []);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const roleResponse = await fetch(`${API_URL}/api/auth/status`, {
          credentials: 'include'
        });
        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          setUserRole(roleData.role);
          console.log('User role:', roleData.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    
    fetchUserRole();
  }, []);

  // Helper function to format member data with builds
  const formatMemberWithBuilds = (member) => {
    if (!member) return null;
    
    logEvent('FORMAT_MEMBER_START', {
      id: member.id,
      userId: member.user_id,
      role: member.role
    });
    
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
    
    const result = {
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
    
    logEvent('FORMAT_MEMBER_RESULT', {
      userId: result.user_id,
      role: result.role,
      buildsLength: result.builds.length,
      hasSelectedBuild: !!result.selectedBuild
    });
    
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId || !guildId) return;
    
      try {
        logEvent('FETCH_START', { eventId, guildId });
        
        // Use the new dedicated endpoint
        const response = await fetch(
          `${API_URL}/api/events/${eventId}/team-planner-data?guildId=${guildId}`,
          { credentials: 'include' }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch team planner data');
        }
        
        const data = await response.json();
        logEvent('DATA_RECEIVED', { 
          teamsCount: data.teams.length, 
          participantsCount: data.participants.length 
        });
        
        // Process the teams and participants
        setTeams(data.teams || []);
        
        // Process participants with better error handling
        const processedParticipants = (data.participants || []).map(participant => {
          console.log('Processing participant:', {
            id: participant.id,
            userId: participant.user_id,
            role: participant.role,
            hasSelectedBuild: !!participant.selected_build
          });
          
          // Handle builds data
          let builds = [];
          if (participant.User?.builds) {
            if (typeof participant.User.builds === 'string') {
              try {
                builds = JSON.parse(participant.User.builds);
              } catch (e) {
                console.error('Error parsing builds:', e);
                builds = [];
              }
            } else if (Array.isArray(participant.User.builds)) {
              builds = participant.User.builds;
            }
          }
          
          // Handle selected_build data
          let selectedBuild = null;
          if (participant.selected_build) {
            if (typeof participant.selected_build === 'string') {
              try {
                selectedBuild = JSON.parse(participant.selected_build);
              } catch (e) {
                console.error('Error parsing selected_build:', e);
              }
            } else {
              selectedBuild = participant.selected_build;
            }
          }
          
          return {
            id: participant.id,
            user_id: participant.user_id,
            User: {
              ...participant.User,
              builds: builds
            },
            role: participant.role,
            selected_build: selectedBuild,
            builds: builds
          };
        });
        
        setParticipants(processedParticipants);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to load data');
      }
    };

    fetchData();
  }, [eventId, guildId]);

  // Handle build selection
  const handleBuildSelect = (member) => {
    setSelectedMember(member);
    setBuildDialogOpen(true);
  };

  // Handle build change
  const handleBuildChange = (index, build) => {
    if (!selectedMember) return;
    
    // Get user ID
    const userId = selectedMember.user_id || selectedMember.id || (selectedMember.User?.id);
    
    // Store selection in localStorage
    storeBuildSelection(eventId, userId, selectedMember.role, index, build);
    
    // Find if member is in participants or a team
    let inParticipants = false;
    let teamId = null;
    
    // Check participants first
    const participantIndex = participants.findIndex(p => 
      (p.user_id === userId) || (p.id === userId) || (p.User?.id === userId)
    );
    
    if (participantIndex >= 0) {
      inParticipants = true;
    } else {
      // Check teams
      for (const team of teams) {
        const memberIndex = team.members.findIndex(m => 
          (m.user_id === userId) || (m.id === userId) || (m.User?.id === userId)
        );
        
        if (memberIndex >= 0) {
          teamId = team.id;
          break;
        }
      }
    }
    
    // Update the appropriate state
    if (inParticipants) {
      setParticipants(prev => 
        prev.map(p => {
          if ((p.user_id === userId) || (p.id === userId) || (p.User?.id === userId)) {
            return {
              ...p,
              activeBuildIndex: index,
              selectedBuild: build
            };
          }
          return p;
        })
      );
    } else if (teamId) {
      setTeams(prev => 
        prev.map(team => {
          if (team.id === teamId) {
            return {
              ...team,
              members: team.members.map(m => {
                if ((m.user_id === userId) || (m.id === userId) || (m.User?.id === userId)) {
                  return {
                    ...m,
                    activeBuildIndex: index,
                    selectedBuild: build
                  };
                }
                return m;
              })
            };
          }
          return team;
        })
      );
    }
    
    // Close dialog
    setBuildDialogOpen(false);
    setSelectedMember(null);
  };

  // Handle dropping a member on a team
  const handleDrop = async (memberId, teamId) => {
    if (!hasEditPermission()) {
      setError('You do not have permission to modify teams');
      return;
    }
    
    logEvent('DROP_START', { memberId, teamId });
    
    try {
      let member = participants.find(p => 
        p.id === memberId || p.user_id === memberId || 
        (p.User && p.User.id === memberId)
      );
      let sourceTeamId = null;
  
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
        logEvent('DROP_ERROR', { error: 'Member not found', memberId });
        return;
      }
      
      logEvent('MEMBER_FOUND', {
        sourceTeamId,
        role: member.role,
        selectedBuild: member.selectedBuild || member.selected_build
      });
      
      if (sourceTeamId === teamId) {
        logEvent('DROP_CANCELLED', { reason: 'Same team' });
        return;
      }
      
      const userId = member.user_id || member.id || (member.User && member.User.id);
      if (!userId) {
        console.error('Unable to determine user ID from member:', member);
        logEvent('DROP_ERROR', { error: 'Invalid user ID' });
        throw new Error('Invalid member data - missing user ID');
      }
  
      // Extract the selected build - try multiple possible locations
      const selectedBuild = member.selectedBuild || member.selected_build || 
                           (typeof member.selected_build === 'string' ? 
                            JSON.parse(member.selected_build) : null) ||
                           (member.builds && member.builds.length > 0 ? member.builds[0] : null);
  
      // Preserve the role when making API request
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId: userId,
          role: member.role, // Keep the original role
          sourceTeamId,
          guildId: guildId,
          selectedBuild: selectedBuild // Include the selected build
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        logEvent('API_ERROR', { status: response.status, error: errorData });
        throw new Error(errorData.error || 'Failed to update team member');
      }
  
      const updatedMember = await response.json();
      logEvent('API_SUCCESS', { updatedMember: {
        id: updatedMember.id,
        role: updatedMember.role
      }});
  
      // When processing UI updates, ensure we keep the role and build info
      if (sourceTeamId) {
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
                role: member.role, // Keep the original role
                selectedBuild: selectedBuild // Keep the selected build
              }]
            };
          }
          return team;
        }));
      } else {
        setParticipants(prev => prev.filter(p => 
          p.id !== memberId && 
          p.user_id !== memberId && 
          (p.User?.id !== memberId)
        ));
        
        setTeams(prev => prev.map(team => {
          if (team.id === teamId) {
            return {
              ...team,
              members: [...(team.members || []), {
                ...member,
                role: member.role, // Keep the original role
                selectedBuild: selectedBuild // Keep the selected build
              }]
            };
          }
          return team;
        }));
      }
      
      logEvent('STATE_UPDATED', {
        action: sourceTeamId ? 'Moved between teams' : 'Moved from participants to team',
        teamId
      });
    } catch (error) {
      console.error('Error updating team:', error);
      logEvent('DROP_ERROR', { error: error.message });
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
      if (!userId) {
        throw new Error('Invalid member data');
      }
      
      // Make sure we capture the member's role BEFORE removing them
      console.log("Removing member with role:", member.role);
  
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members/${userId}?guildId=${guildId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove team member');
      }
  
      // When adding back to participants, preserve build data AND role
      const storedSelection = getStoredBuildSelection(eventId, userId);
      
      // Create a proper copy of the member with all necessary properties
      const memberWithBuildData = {
        ...member,
        user_id: userId,
        role: member.role, // Explicitly preserve the role
        selectedBuild: member.selectedBuild || member.selected_build,
        selected_build: member.selectedBuild || member.selected_build,
        // Make sure builds is also preserved
        builds: member.builds || member.User?.builds || [],
        // Keep reference to User data
        User: member.User || { 
          id: userId, 
          username: member.username,
          builds: member.builds || []
        }
      };
      
      console.log("Adding back to participants:", {
        userId,
        role: memberWithBuildData.role,
        hasSelectedBuild: !!memberWithBuildData.selectedBuild
      });
      
      // Add back to participants with the preserved role
      setParticipants(prev => [...prev, formatMemberWithBuilds(memberWithBuildData)]);
  
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
    } catch (error) {
      console.error('Error removing team member:', error);
      setError(error.message || 'Failed to remove team member');
    }
  };

  // Team component with React DnD
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
  
    const handleNameSave = () => {
      if (!canEdit) return;
      onEdit({ ...team, name: teamName });
      setIsEditingName(false);
    };
  
    // Calculate role distributions
    const roleCounts = {
      tank: team.members?.filter(m => m.role?.toUpperCase() === 'TANK').length || 0,
      healer: team.members?.filter(m => m.role?.toUpperCase() === 'HEALER').length || 0,
      dps: team.members?.filter(m => m.role?.toUpperCase() === 'DPS').length || 0
    };
  
    return (
      <Paper
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
          {isEditingName && canEdit ? (
            <TextField
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onBlur={handleNameSave}
              onKeyPress={(e) => e.key === 'Enter' && handleNameSave()}
              autoFocus
              size="small"
              sx={{
                '& .MuiInputBase-input': { 
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  padding: '6px 10px'
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                }
              }}
            />
          ) : (
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'white',
                fontWeight: 600,
                cursor: canEdit ? 'pointer' : 'default',
                '&:hover': canEdit ? { color: '#90caf9' } : {}
              }}
              onClick={() => canEdit && setIsEditingName(true)}
            >
              {team.name}
            </Typography>
          )}
          
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
      </Paper>
    );
  };

  // ParticipantPool component
  const ParticipantPool = ({ participants, getRoleStyles }) => {
    // Group participants by role
    const roleGroups = {
      tank: participants.filter(p => getParticipantSpec(p) === 'Tank'),
      healer: participants.filter(p => getParticipantSpec(p) === 'Healer'),
      dps: participants.filter(p => getParticipantSpec(p) === 'DPS'),
      tentative: participants.filter(p => getParticipantSpec(p) === 'Tentative'),
      absent: participants.filter(p => getParticipantSpec(p) === 'Absent')
    };
  
    const roleIconMap = {
      tank: <ShieldIcon sx={{ fontSize: 20 }} />,
      healer: <LocalHospitalIcon sx={{ fontSize: 20 }} />,
      dps: <FlashOnIcon sx={{ fontSize: 20 }} />,
      tentative: <HelpOutlineIcon sx={{ fontSize: 20 }} />,
      absent: <DoNotDisturbAltIcon sx={{ fontSize: 20 }} />
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
        <Paper 
          elevation={0}
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
              roleGroups.tank.map(member => (
                <DraggableMember 
                  key={member.id || member.user_id || (member.User?.id)} 
                  member={member} 
                  getRoleStyles={getRoleStyles}
                />
              ))
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No tanks available
              </Typography>
            )}
          </Box>
        </Paper>
  
        <Paper 
          elevation={0}
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
              roleGroups.healer.map(member => (
                <DraggableMember 
                  key={member.id || member.user_id || (member.User?.id)} 
                  member={member}
                  getRoleStyles={getRoleStyles} 
                />
              ))
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No healers available
              </Typography>
            )}
          </Box>
        </Paper>
  
        <Paper 
          elevation={0}
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
              roleGroups.dps.map(member => (
                <DraggableMember 
                  key={member.id || member.user_id || (member.User?.id)} 
                  member={member}
                  getRoleStyles={getRoleStyles} 
                />
              ))
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', py: 2 }}>
                No DPS available
              </Typography>
            )}
          </Box>
        </Paper>
  
        {/* Add sections for Tentative and Absent if needed */}
      </Box>
    );
  };

  // Return the main UI, wrapping it with DndProvider
  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: 'white' }}>
            Team Planner
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {hasEditPermission() && (
              <>
                <Button
                  variant="contained"
                  onClick={() => setOpenPresetDialog(true)}
                  sx={{
                    bgcolor: '#4CAF50',
                    '&:hover': { bgcolor: '#45a049' }
                  }}
                >
                  Save as Preset
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    // Load presets
                    fetch(`${API_URL}/api/team-presets/guild/${guildId}`, {
                      credentials: 'include'
                    })
                    .then(response => response.json())
                    .then(data => setPresets(data))
                    .catch(error => {
                      console.error('Error loading presets:', error);
                      setError('Failed to load presets');
                    });
                  }}
                  sx={{
                    bgcolor: '#2196F3',
                    '&:hover': { bgcolor: '#1976D2' }
                  }}
                >
                  Load Preset
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    // Create team
                    fetch(`${API_URL}/api/teams`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        name: `Team ${teams.length + 1}`,
                        eventId,
                        guildId: guildId
                      })
                    })
                    .then(response => response.json())
                    .then(newTeam => {
                      setTeams(prev => [...prev, { ...newTeam, members: [] }]);
                    })
                    .catch(error => {
                      console.error('Error creating team:', error);
                      setError('Failed to create team');
                    });
                  }}
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
                  onClick={captureAndSendTeamImages}
                  disabled={isAnnouncingTeams || teams.length === 0}
                  startIcon={<PhotoCameraIcon />}
                  sx={{
                    bgcolor: '#ff9800',
                    '&:hover': { bgcolor: '#ed8c00' },
                    '&.Mui-disabled': { bgcolor: 'rgba(255, 152, 0, 0.3)' }
                  }}
                >
                  {isAnnouncingTeams ? 'Processing...' : 'Screenshot Teams'}
                </Button>
                
                {/* Announce Teams button */}
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsAnnouncingTeams(true);
                    
                    // Format teams data
                    const teamsData = teams.map(team => ({
                      id: team.id,
                      name: team.name,
                      members: team.members.map(member => ({
                        id: member.user_id || member.id || (member.User?.id),
                        username: member.User?.username || member.username,
                        role: member.role
                      }))
                    }));
                    
                    fetch(`${API_URL}/api/discord-bot/announce-teams`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        eventId,
                        guildId,
                        teams: teamsData
                      })
                    })
                    .then(response => {
                      if (!response.ok) throw new Error('Failed to announce teams');
                      setAnnounceSuccess({
                        success: true,
                        message: "Teams announced successfully to Discord!"
                      });
                    })
                    .catch(error => {
                      console.error('Error announcing teams:', error);
                      setAnnounceSuccess({
                        success: false,
                        message: error.message || 'Failed to announce teams'
                      });
                    })
                    .finally(() => {
                      setIsAnnouncingTeams(false);
                    });
                  }}
                  disabled={isAnnouncingTeams || teams.length === 0}
                  startIcon={<SendIcon />}
                  sx={{
                    bgcolor: '#9c27b0',
                    '&:hover': { bgcolor: '#7B1FA2' },
                    '&.Mui-disabled': { bgcolor: 'rgba(156, 39, 176, 0.3)' }
                  }}
                >
                  {isAnnouncingTeams ? 'Sending...' : 'Announce Teams'}
                </Button>
              </>
            )}
          </Box>
        </Box>
    
        <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <ParticipantPool participants={participants}
          getRoleStyles={getRoleStyles} 
          />
            
            {/* Absentees Section */}
            <Paper sx={{ p: 2, mt: 2, bgcolor: '#1e1e1e' }}>
              <Typography variant="h6" sx={{ 
                color: 'white', 
                mb: 1,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                pb: 0.5
              }}>
                Absent Members ({absentees?.length || 0})
              </Typography>
              {absentees && absentees.length > 0 ? (
                <Box sx={{ ml: 1 }}>
                  {absentees.map(member => (
                    <Box
                      key={member.id || member.user_id}
                      sx={{
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 1,
                        p: 0.5,
                        mb: 0.5,
                        bgcolor: '#555',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Typography 
                        variant="body2"
                        sx={{
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {member.User?.username || member.username}
                      </Typography>
                      {hasEditPermission() && (
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{
                            minWidth: '60px',
                            fontSize: '0.7rem',
                            ml: 1,
                            color: '#90caf9',
                            borderColor: '#90caf9'
                          }}
                          onClick={() => {
                            // Sign up absentee via API
                            fetch(`${API_URL}/api/events/${eventId}/signup`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              credentials: 'include',
                              body: JSON.stringify({ 
                                userId: member.id || member.user_id,
                                role: 'DPS',
                                guildId
                              })
                            })
                            .then(response => {
                              if (!response.ok) throw new Error('Failed to sign up member');
                              
                              // Update local state
                              const memberData = {
                                ...member,
                                role: 'DPS'
                              };
                              
                              setAbsentees(prev => 
                                prev.filter(m => 
                                  m.id !== (member.id || member.user_id) && 
                                  m.user_id !== (member.id || member.user_id)
                                )
                              );
                              
                              setParticipants(prev => [...prev, formatMemberWithBuilds(memberData)]);
                            })
                            .catch(error => {
                              console.error('Error signing up absentee:', error);
                              setError(error.message || 'Failed to sign up member');
                            });
                          }}
                        >
                          Add
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                  No absent members
                </Typography>
              )}
            </Paper>
          </Grid>
    
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {teams.map(team => (
                <Grid item xs={12} md={6} lg={4} key={team.id}>
                  <Team 
                    team={team} 
                    onDrop={handleDrop}
                    onRemove={(teamId) => {
                      // Call API to delete team
                      fetch(`${API_URL}/api/teams/${teamId}?guildId=${guildId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                      })
                      .then(response => {
                        if (!response.ok) throw new Error('Failed to delete team');
                        
                        // Move team members back to participants pool
                        const team = teams.find(t => t.id === teamId);
                        if (team) {
                          setParticipants(prev => [
                            ...prev, 
                            ...(team.members || []).map(m => formatMemberWithBuilds(m))
                          ]);
                        }
                        
                        // Remove team from state
                        setTeams(prev => prev.filter(t => t.id !== teamId));
                      })
                      .catch(error => {
                        console.error('Error deleting team:', error);
                        setError('Failed to delete team');
                      });
                    }}
                    onEdit={handleEditTeam}
                    onRemoveMember={handleRemoveMember}
                    canEdit={hasEditPermission()}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
    
        {/* Save Preset Dialog */}
        <Dialog open={openPresetDialog} onClose={() => setOpenPresetDialog(false)}>
          <DialogTitle>Save Team Preset</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Preset Name"
              fullWidth
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              sx={{
                '& .MuiInputBase-input': { color: 'white' },
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPresetDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              // Save preset via API
              fetch(`${API_URL}/api/team-presets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  name: presetName,
                  eventId,
                  teamsData: teams,
                  guildId: guildId
                })
              })
              .then(response => {
                if (!response.ok) throw new Error('Failed to save preset');
                setOpenPresetDialog(false);
                setPresetName('');
              })
              .catch(error => {
                console.error('Error saving preset:', error);
                setError('Failed to save preset');
              });
            }}>Save</Button>
          </DialogActions>
        </Dialog>
    
        {/* Load Preset Dialog */}
        <Dialog open={!!presets.length} onClose={() => setPresets([])}>
          <DialogTitle>Load Preset</DialogTitle>
          <List>
            {presets.map((preset) => (
              <ListItem
                key={preset.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  pr: 2
                }}
              >
                <ListItemText 
                  primary={preset.name}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    // Load preset
                    const loadPreset = async () => {
                      try {
                        // Delete existing teams
                        await Promise.all(
                          teams.map(team => 
                            fetch(`${API_URL}/api/teams/${team.id}?guildId=${guildId}`, {
                              method: 'DELETE',
                              credentials: 'include'
                            })
                          )
                        );
                    
                        // Get preset data
                        const response = await fetch(`${API_URL}/api/team-presets/${preset.id}?guildId=${guildId}`, {
                          credentials: 'include'
                        });
                        
                        if (!response.ok) throw new Error('Failed to load preset');
                        const data = await response.json();
                    
                        // Get member IDs from preset
                        const presetMemberIds = new Set(
                          data.teams_data.flatMap(team => 
                            (team.members || []).map(member => member.user_id)
                          )
                        );
                    
                        // Update participants - remove those in the preset
                        setParticipants(prev => 
                          prev.filter(participant => {
                            const userId = participant.user_id || participant.id || (participant.User?.id);
                            return !presetMemberIds.has(userId);
                          })
                        );
                    
                        // Create teams from preset
                        const createdTeams = await Promise.all(
                          data.teams_data.map(async (teamData) => {
                            const response = await fetch(`${API_URL}/api/teams`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                name: teamData.name,
                                eventId,
                                guildId: guildId
                              })
                            });
                            
                            if (!response.ok) throw new Error('Failed to create team');
                            const newTeam = await response.json();
                    
                            // Add members to the team
                            if (teamData.members?.length) {
                              await Promise.all(
                                teamData.members.map(member => 
                                  fetch(`${API_URL}/api/teams/${newTeam.id}/members`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      memberId: member.user_id,
                                      role: member.role,
                                      guildId: guildId
                                    })
                                  })
                                )
                              );
                            }
                    
                            return {
                              ...newTeam,
                              members: (teamData.members || []).map(member => formatMemberWithBuilds(member))
                            };
                          })
                        );
                    
                        setTeams(createdTeams);
                        setPresets([]);
                      } catch (error) {
                        console.error('Error loading preset:', error);
                        setError('Failed to load preset');
                      }
                    };
                    
                    loadPreset();
                  }}
                />
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => {
                    setPresetToDelete(preset);
                    setDeletePresetDialog(true);
                  }}
                >
                  Delete
                </Button>
              </ListItem>
            ))}
          </List>
        </Dialog>
    
        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deletePresetDialog} 
          onClose={() => {
            setDeletePresetDialog(false);
            setPresetToDelete(null);
          }}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the "{presetToDelete?.name}" Preset?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setDeletePresetDialog(false);
                setPresetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              color="error"
              onClick={() => {
                // Delete preset
                fetch(`${API_URL}/api/team-presets/${presetToDelete.id}?guildId=${guildId}`, {
                  method: 'DELETE',
                  credentials: 'include'
                })
                .then(response => {
                  if (!response.ok) throw new Error('Failed to delete preset');
                  
                  // Remove from list
                  setPresets(prev => prev.filter(p => p.id !== presetToDelete.id));
                  setDeletePresetDialog(false);
                  setPresetToDelete(null);
                })
                .catch(error => {
                  console.error('Error deleting preset:', error);
                  setError('Failed to delete preset');
                });
              }}
            >
              Delete
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
    
        {/* Team announcement notification */}
        <Snackbar 
          open={announceSuccess !== null} 
          autoHideDuration={6000} 
          onClose={() => setAnnounceSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setAnnounceSuccess(null)} 
            severity={announceSuccess?.success ? "success" : "error"}
            sx={{ width: '100%' }}
          >
            {announceSuccess?.message}
          </Alert>
        </Snackbar>
        
        {/* Error notification */}
        {error && (
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
        )}
      </Box>
    </DndProvider>
  );
};

export default TeamPlanner;