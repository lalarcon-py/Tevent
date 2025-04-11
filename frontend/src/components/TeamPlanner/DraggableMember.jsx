// Required imports
import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Tooltip 
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DoNotDisturbAltIcon from '@mui/icons-material/DoNotDisturbAlt';

// Helper function to determine weapon spec from weapon combination
const getWeaponSpec = (primary, secondary) => {
  if (!primary || !secondary) return '';
  
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
  
  // Try both orders of the weapons
  const combo1 = `${primary}|${secondary}`;
  const combo2 = `${secondary}|${primary}`;
  
  return WEAPON_SPECS[combo1] || WEAPON_SPECS[combo2] || '';
};

// Helper function to get stored build selection from localStorage
const getStoredBuildSelection = (eventId, userId) => {
  try {
    const storageKey = `event_${eventId}_build_selections`;
    const existingData = localStorage.getItem(storageKey);
    
    if (existingData) {
      const selections = JSON.parse(existingData);
      return selections[userId];
    }
  } catch (error) {
    console.error('Error retrieving build selection:', error);
  }
  
  return null;
};

// Complete DraggableMember component
const DraggableMember = ({ member, onRemove }) => {
  const { eventId } = useParams();
  const dragRef = useRef(null);
  
  useEffect(() => {
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
  
  // Get role styling
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

export default DraggableMember;