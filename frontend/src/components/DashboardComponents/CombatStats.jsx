import React from 'react';
import { Typography, Box, Avatar, Divider, LinearProgress, Grid, Paper } from '@mui/material';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

const CombatStats = ({ data }) => {
  if (!data) return <Typography>Loading combat stats...</Typography>;

  console.log("Combat stats data:", data); // Add this to see the structure of your data
  
  // Process weapons data from the actual API response
  const primaryWeapons = Object.entries(data.weapons?.primary || {})
    .map(([weapon, count]) => ({ weapon, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const secondaryWeapons = Object.entries(data.weapons?.secondary || {})
    .map(([weapon, count]) => ({ weapon, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  // Process roles data
  const roleData = Object.entries(data.roles || {})
    .map(([role, count]) => ({ role, count: Number(count) }))
    .sort((a, b) => b.count - a.count);
    
  // Process specs data
  const specData = Object.entries(data.specs || {})
    .map(([spec, count]) => ({ spec, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Find max values for progress bars
  const maxPrimaryCount = primaryWeapons.length > 0 ? 
    Math.max(...primaryWeapons.map(item => item.count)) : 1;
  const maxSecondaryCount = secondaryWeapons.length > 0 ? 
    Math.max(...secondaryWeapons.map(item => item.count)) : 1;
  const maxRoleCount = roleData.length > 0 ? 
    Math.max(...roleData.map(item => item.count)) : 1;
  const maxSpecCount = specData.length > 0 ? 
    Math.max(...specData.map(item => item.count)) : 1;

  // Calculate total players (approximate from primary weapons)
  const totalPlayers = primaryWeapons.reduce((sum, item) => sum + item.count, 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Combat Statistics
      </Typography>
      
      {/* Class/Role Distribution */}
      {roleData.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Class Distribution
          </Typography>
          
          {roleData.map((item, index) => (
            <Box key={index} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {item.role}
                </Typography>
                <Typography variant="body2">
                  {item.count} players ({Math.round((item.count / maxRoleCount) * 100)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(item.count / maxRoleCount) * 100}
                sx={{
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS[index % COLORS.length],
                    borderRadius: 5
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      {/* Primary Weapons */}
      {primaryWeapons.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Top Primary Weapons
          </Typography>
          
          {primaryWeapons.map((item, index) => (
            <Box key={index} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {item.weapon}
                </Typography>
                <Typography variant="body2">
                  {item.count} players ({Math.round((item.count / maxPrimaryCount) * 100)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(item.count / maxPrimaryCount) * 100}
                sx={{
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS[(index + 2) % COLORS.length],
                    borderRadius: 5
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      {/* Secondary Weapons */}
      {secondaryWeapons.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Top Secondary Weapons
          </Typography>
          
          {secondaryWeapons.map((item, index) => (
            <Box key={index} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {item.weapon}
                </Typography>
                <Typography variant="body2">
                  {item.count} players ({Math.round((item.count / maxSecondaryCount) * 100)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(item.count / maxSecondaryCount) * 100}
                sx={{
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS[(index + 4) % COLORS.length],
                    borderRadius: 5
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      {/* Weapon Specializations */}
      {specData.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Top Weapon Specializations
          </Typography>
          
          {specData.map((item, index) => (
            <Box key={index} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {item.spec}
                </Typography>
                <Typography variant="body2">
                  {item.count} players ({Math.round((item.count / maxSpecCount) * 100)}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(item.count / maxSpecCount) * 100}
                sx={{
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: COLORS[(index + 1) % COLORS.length],
                    borderRadius: 5
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      )}
      
      {!roleData.length && !primaryWeapons.length && 
       !secondaryWeapons.length && !specData.length && (
        <Typography sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
          No combat statistics available
        </Typography>
      )}
    </Box>
  );
};

export default CombatStats;