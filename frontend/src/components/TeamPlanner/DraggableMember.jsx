// frontend/src/components/TeamPlanner/DraggableMember.jsx
import React from 'react';
import { useDrag } from 'react-dnd';
import { Box, Typography, Tooltip } from '@mui/material';

export const DraggableMember = ({ member, roleType }) => {
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

  const getRoleColor = () => {
    switch (roleType?.toLowerCase()) {
      case 'tank': return '#66b3ff';
      case 'healer': return '#66ff66';
      case 'dps': return '#ff6666';
      default: return 'white';
    }
  };

  const getWeaponIcon = (weaponName) => {
    if (!weaponName) return null;
    const formattedName = weaponName.replace(/\s+/g, ' ').trim();
    return `${process.env.PUBLIC_URL}/weapons/${formattedName} Art.png`;
  };

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
      <Box sx={{ display: 'flex', gap: 1, minWidth: 56 }}>
        {member.builds?.[0]?.primary && (
          <Tooltip title={member.builds[0].primary}>
            <img 
              src={getWeaponIcon(member.builds[0].primary)}
              alt={member.builds[0].primary}
              style={{ 
                width: 24, 
                height: 24,
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Tooltip>
        )}
        {member.builds?.[0]?.secondary && (
          <Tooltip title={member.builds[0].secondary}>
            <img 
              src={getWeaponIcon(member.builds[0].secondary)}
              alt={member.builds[0].secondary}
              style={{ 
                width: 24, 
                height: 24,
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
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