// frontend/src/components/TeamPlanner/ParticipantPool.jsx
import React from 'react';
import { Paper, Typography, Box, Avatar, Tooltip } from '@mui/material';
import { DraggableMember } from './DraggableMember';
import { getWeaponImageUrl } from '../../utils/weaponUtils';

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

const getWeaponSpec = (primary, secondary) => {
 const combo1 = `${primary}|${secondary}`;
 const combo2 = `${secondary}|${primary}`;
 return WEAPON_SPECS[combo1] || WEAPON_SPECS[combo2] || 'Unknown Spec';
};

const RoleSection = ({ title, members, roleType }) => {
 const getRoleColor = () => {
   switch (roleType) {
     case 'Tank': return '#66b3ff';
     case 'Healer': return '#66ff66';
     case 'DPS': return '#ff6666';
     default: return 'white';
   }
 };

 return (
   <Paper sx={{ 
     p: 2, 
     mb: 2, 
     bgcolor: '#1e1e1e',
     border: `1px solid ${getRoleColor()}`,
   }}>
     <Typography variant="h6" sx={{ 
       color: getRoleColor(),
       mb: 2 
     }}>
       {title} ({members.length})
     </Typography>
     <Box sx={{ minHeight: 50 }}>
       {members.map((member) => {
         // Try to get the event-specific build data first (if participant has selected_build property)
         let selectedBuildForEvent = member.selected_build;
         if (typeof selectedBuildForEvent === 'string') {
           try {
             selectedBuildForEvent = JSON.parse(selectedBuildForEvent);
           } catch (e) {
             console.error('Error parsing selected_build string:', e);
             selectedBuildForEvent = null;
           }
         }
         
         // Fall back to general builds if no event-specific build
         let builds = member.User?.builds || member.builds || [];
         
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
         
         // Use the selected build for this event if available, otherwise use first build
         const primaryBuild = selectedBuildForEvent || (builds.length > 0 ? builds[0] : null);
         
         // Determine weapon spec
         const weaponSpec = primaryBuild ? 
           getWeaponSpec(primaryBuild.primary, primaryBuild.secondary) : 'Unknown';
         
         // Find the correct username from various possible locations
         const username = member.username || 
                         (member.User && member.User.username) || 
                         'Unknown User';
                         
         // Find avatar from various possible locations
         const avatarUrl = member.avatar_url || 
                          (member.User && member.User.avatar_url) || 
                          null;
                          
         // Find combat power from various possible locations
         const combatPower = member.combat_power || 
                            (member.User && member.User.combat_power) || 
                            null;
         
         return (
           <DraggableMember
             key={member.id || member.user_id || (member.User && member.User.id)}
             member={{
               ...member,
               builds: builds,
               selectedBuild: primaryBuild,
               weaponSpec: weaponSpec
             }}
             roleType={roleType}
           >
             <Box sx={{
               display: 'flex',
               alignItems: 'center',
               gap: 2,
               p: 1
             }}>
               <Avatar 
                 src={avatarUrl}
                 alt={username}
                 sx={{ width: 40, height: 40 }}
               />
               <Box>
                 <Typography sx={{ color: 'white' }}>
                   {username}
                 </Typography>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   {primaryBuild?.primary && (
                     <Tooltip title={primaryBuild.primary}>
                       <img 
                         src={`/weapons/${primaryBuild.primary} Art.png`}
                         alt={primaryBuild.primary}
                         style={{ width: 24, height: 24 }}
                         onError={(e) => { e.target.style.display = 'none'; }}
                       />
                     </Tooltip>
                   )}
                   {primaryBuild?.secondary && (
                     <Tooltip title={primaryBuild.secondary}>
                       <img 
                         src={`/weapons/${primaryBuild.secondary} Art.png`}
                         alt={primaryBuild.secondary}
                         style={{ width: 24, height: 24 }}
                         onError={(e) => { e.target.style.display = 'none'; }}
                       />
                     </Tooltip>
                   )}
                   <Typography sx={{ color: '#90caf9', fontSize: '0.875rem' }}>
                     {weaponSpec}
                   </Typography>
                 </Box>
               </Box>
               {combatPower && (
                 <Typography sx={{ 
                   color: '#ffd700', 
                   ml: 'auto',
                   fontSize: '0.875rem'
                 }}>
                   CP: {combatPower}
                 </Typography>
               )}
             </Box>
           </DraggableMember>
         );
       })}
     </Box>
   </Paper>
 );
};

const ParticipantPool = ({ participants }) => {
  const { eventId } = useParams();
  const [selectedMember, setSelectedMember] = useState(null);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  
  // Group participants by role
  const roleGroups = {
    tank: participants.filter(p => determineParticipantRole(p) === 'tank'),
    healer: participants.filter(p => determineParticipantRole(p) === 'healer'),
    dps: participants.filter(p => determineParticipantRole(p) === 'dps')
  };

  const handleBuildSelect = (member) => {
    setSelectedMember(member);
    setBuildDialogOpen(true);
  };

  const handleBuildChange = (index, build) => {
    // Get user ID
    const userId = selectedMember.user_id || selectedMember.id || (selectedMember.User?.id);
    
    // Store selection in localStorage
    storeBuildSelection(eventId, userId, selectedMember.role, index, build);
    
    // Update local state with new build selection
    const updatedParticipants = participants.map(p => {
      if ((p.user_id === userId) || (p.id === userId) || (p.User?.id === userId)) {
        return {
          ...p,
          activeBuildIndex: index,
          selectedBuild: build
        };
      }
      return p;
    });
    
    // Update participants state
    setParticipants(updatedParticipants);
    
    // Close dialog
    setBuildDialogOpen(false);
    setSelectedMember(null);
  };

  const getParticipantSpec = (participant) => {
    // First check if there's an event-specific selected build
    if (participant.selected_build) {
      let selectedBuild = participant.selected_build;
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
    return null;
  };

  return (
    <Paper sx={{ p: 2, bgcolor: '#1e1e1e' }}>
      {Object.entries(roleGroups).map(([role, members]) => (
        <Box key={role} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ 
            color: 'white', 
            mb: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            pb: 0.5
          }}>
            {role.charAt(0).toUpperCase() + role.slice(1)} ({members.length})
          </Typography>
          <Box sx={{ ml: 1 }}>
            {members.map(member => (
              <Box 
                key={member.id || member.user_id || (member.User?.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1
                }}
              >
                <DraggableMember member={member} />
                
                {/* Add build selection button */}
                {(member.builds?.length > 1) && (
                  <IconButton 
                    size="small" 
                    onClick={() => handleBuildSelect(member)}
                    sx={{ color: 'white', ml: 1 }}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
      
      {/* Build selection dialog */}
      <BuildSelectionDialog
        open={buildDialogOpen}
        member={selectedMember}
        onClose={() => {
          setBuildDialogOpen(false);
          setSelectedMember(null);
        }}
        onSelectBuild={handleBuildChange}
      />
    </Paper>
  );
};

export default ParticipantPool;