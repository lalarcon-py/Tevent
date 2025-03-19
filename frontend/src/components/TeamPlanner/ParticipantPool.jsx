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
       {members.map((member) => (
         <DraggableMember
           key={member.id}
           member={{
             ...member,
             weaponSpec: getWeaponSpec(
               member.builds[0]?.primary,
               member.builds[0]?.secondary
             )
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
               src={member.avatar_url}
               alt={member.username}
               sx={{ width: 40, height: 40 }}
             />
             <Box>
               <Typography sx={{ color: 'white' }}>
                 {member.username}
               </Typography>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 {member.builds[0]?.primary && (
                   <Tooltip title={member.builds[0].primary}>
                     <img 
                       src={getWeaponImageUrl(member.builds[0].primary)}
                       alt={member.builds[0].primary}
                       style={{ width: 24, height: 24 }}
                     />
                   </Tooltip>
                 )}
                 {member.builds[0]?.secondary && (
                   <Tooltip title={member.builds[0].secondary}>
                     <img 
                       src={getWeaponImageUrl(member.builds[0].secondary)}
                       alt={member.builds[0].secondary}
                       style={{ width: 24, height: 24 }}
                     />
                   </Tooltip>
                 )}
                 <Typography sx={{ color: '#90caf9', fontSize: '0.875rem' }}>
                   {member.weaponSpec}
                 </Typography>
               </Box>
             </Box>
             {member.combat_power && (
               <Typography sx={{ 
                 color: '#ffd700', 
                 ml: 'auto',
                 fontSize: '0.875rem'
               }}>
                 CP: {member.combat_power}
               </Typography>
             )}
           </Box>
         </DraggableMember>
       ))}
     </Box>
   </Paper>
 );
};

const ParticipantPool = ({ eventId, participants }) => {
 return (
   <Box>
     <RoleSection 
       title="Tanks"
       members={participants.filter(p => p.builds[0]?.spec === 'Tank')}
       roleType="Tank"
     />
     <RoleSection 
       title="Healers"
       members={participants.filter(p => p.builds[0]?.spec === 'Healer')}
       roleType="Healer"
     />
     <RoleSection 
       title="DPS"
       members={participants.filter(p => p.builds[0]?.spec === 'DPS')}
       roleType="DPS"
     />
   </Box>
 );
};

export default ParticipantPool;