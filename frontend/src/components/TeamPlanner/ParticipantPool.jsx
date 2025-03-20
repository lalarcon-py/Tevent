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

const ParticipantPool = ({ eventId, participants }) => {
  // Helper function to determine participant spec
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

  React.useEffect(() => {
    console.log('--- DEBUGGING PARTICIPANT POOL ---');
    console.log('Total participants:', participants.length);
    
    // Debug the first few participants
    if (participants.length > 0) {
      participants.slice(0, 3).forEach((participant, index) => {
        console.group(`Participant ${index}`);
        console.log('Raw participant data:', participant);
        console.log('Spec determination:', getParticipantSpec(participant));
        console.log('Data location check:', {
          'selected_build': participant.selected_build,
          'participant.builds': participant.builds,
          'participant.User?.builds': participant.User?.builds,
          'role': participant.role
        });
        console.groupEnd();
      });
    }
  }, [participants]);
  
  return (
    <Box>
      <RoleSection 
        title="Tanks"
        members={participants.filter(p => getParticipantSpec(p) === 'Tank')}
        roleType="Tank"
      />
      <RoleSection 
        title="Healers"
        members={participants.filter(p => getParticipantSpec(p) === 'Healer')}
        roleType="Healer"
      />
      <RoleSection 
        title="DPS"
        members={participants.filter(p => getParticipantSpec(p) === 'DPS')}
        roleType="DPS"
      />
    </Box>
  );
};

export default ParticipantPool;