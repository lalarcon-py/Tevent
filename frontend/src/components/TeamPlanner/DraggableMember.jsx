// frontend/src/components/TeamPlanner/DraggableMember.jsx
import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Box, Typography, Tooltip } from '@mui/material';

export const DraggableMember = ({ member, roleType }) => {
  const [fetchedBuilds, setFetchedBuilds] = useState(null);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'MEMBER',
    item: { 
      id: member.id,
      roleType,
      username: member.User?.username || member.username,
      builds: member.builds
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  // Fetch builds if they're missing
  useEffect(() => {
    const loadMemberBuilds = async () => {
      // Check if member already has builds
      const existingBuilds = member.User?.builds || member.builds;
      if (existingBuilds && Array.isArray(existingBuilds) && existingBuilds.length > 0) {
        console.log('Member already has builds, no need to fetch');
        return;
      }
      
      // Get the member ID for the API request
      const memberId = member.id || member.user_id || (member.User?.id);
      if (!memberId) {
        console.error('Cannot fetch builds - no valid member ID');
        return;
      }
      
      try {
        setIsLoadingBuilds(true);
        
        // Get guild ID for API request
        const guildId = localStorage.getItem('guildId');
        if (!guildId) {
          console.error('No guild ID found');
          return;
        }
        
        console.log(`Fetching builds for member: ${memberId}`);
        
        // Try fetching from the guild members endpoint
        const response = await fetch(`/api/guilds/${guildId}/members`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch guild members: ${response.status}`);
        }
        
        const allMembers = await response.json();
        
        // Find the specific member in the members array
        const memberData = allMembers.find(m => 
          m.id === memberId || m.user_id === memberId || (m.User && m.User.id === memberId)
        );
        
        if (!memberData) {
          console.warn(`Member ${memberId} not found in guild members data`);
          return;
        }
        
        console.log('Found member data:', memberData);
        
        // Get builds from User object or direct builds property
        let userBuilds = memberData.User?.builds || memberData.builds;
        
        // Parse builds if they're stored as a string
        if (typeof userBuilds === 'string') {
          try {
            userBuilds = JSON.parse(userBuilds);
          } catch (e) {
            console.error('Failed to parse builds string:', e);
          }
        }
        
        if (userBuilds && Array.isArray(userBuilds)) {
          console.log('Setting fetched builds:', userBuilds);
          setFetchedBuilds(userBuilds);
        }
      } catch (error) {
        console.error('Error fetching member builds:', error);
      } finally {
        setIsLoadingBuilds(false);
      }
    };
    
    loadMemberBuilds();
  }, [member]);

  const getRoleColor = () => {
    switch (roleType?.toLowerCase()) {
      case 'tank': return '#66b3ff';
      case 'healer': return '#66ff66';
      case 'dps': return '#ff6666';
      default: return 'white';
    }
  };

  // Use fetchedBuilds if available, otherwise fall back to member builds
  let builds = fetchedBuilds;
  
  // If no fetched builds, try to use builds from member
  if (!builds || !Array.isArray(builds) || builds.length === 0) {
    builds = member.User?.builds || member.builds || [];
  }
  
  // If builds is a string (JSON), parse it
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
  
  // Get primary and secondary weapons
  const primaryWeapon = builds[0]?.primary || '';
  const secondaryWeapon = builds[0]?.secondary || '';
  
  // Get image URLs directly from the public folder
  const primaryImageUrl = primaryWeapon ? `/weapons/${primaryWeapon} Art.png` : null;
  const secondaryImageUrl = secondaryWeapon ? `/weapons/${secondaryWeapon} Art.png` : null;

  return (
    <Box
      ref={drag}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        width: '100%',
        '&:hover': { 
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          transform: 'scale(1.02)',
          transition: 'all 0.2s ease'
        }
      }}
    >
      {/* Weapon icons - with loading indicator */}
      <Box sx={{ display: 'flex', gap: 1, minWidth: 56 }}>
        {isLoadingBuilds ? (
          // Show loading indicator
          <Box sx={{ 
            width: 48, 
            height: 24, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: 'white', 
              animation: 'pulse 1s infinite' 
            }} />
          </Box>
        ) : primaryWeapon ? (
          // Show weapons if we have them
          <>
            <Tooltip title={primaryWeapon}>
              <img 
                src={primaryImageUrl}
                alt={primaryWeapon}
                style={{ 
                  width: 24, 
                  height: 24,
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  console.error(`Failed to load image: ${primaryImageUrl}`);
                  e.target.style.display = 'none';
                }}
              />
            </Tooltip>
            {secondaryWeapon && (
              <Tooltip title={secondaryWeapon}>
                <img 
                  src={secondaryImageUrl}
                  alt={secondaryWeapon}
                  style={{ 
                    width: 24, 
                    height: 24,
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    console.error(`Failed to load image: ${secondaryImageUrl}`);
                    e.target.style.display = 'none';
                  }}
                />
              </Tooltip>
            )}
          </>
        ) : (
          // No weapons found
          <Tooltip title="No weapon data available">
            <Box sx={{ 
              width: 24, 
              height: 24, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)'
            }}>
              ?
            </Box>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ 
          color: getRoleColor(),
          fontWeight: 'medium',
          fontSize: '0.9rem'
        }}>
          {member.User?.username || member.username}
        </Typography>
      </Box>

      {member.combat_power && (
        <Typography sx={{ 
          color: '#ffd700',
          fontSize: '0.8rem',
          ml: 1
        }}>
          CP: {member.combat_power}
        </Typography>
      )}
    </Box>
  );
};

export default DraggableMember;