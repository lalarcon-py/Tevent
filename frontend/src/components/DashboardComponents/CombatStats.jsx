import React from 'react';
import { Typography, Box, LinearProgress, Grid } from '@mui/material';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

const CombatStats = ({ data }) => {
  if (!data) return <Typography>Loading combat stats...</Typography>;
  
  console.log("Combat stats data:", data);
  
  // Ensure data structure is correct
  const roles = data.roles || {};
  const specs = data.specs || {};
  const weapons = data.weapons || { primary: {}, secondary: {} };
  
  // Check if we have actual data
  const hasRoles = Object.keys(roles).length > 0;
  const hasSpecs = Object.keys(specs).length > 0;
  const hasPrimaryWeapons = Object.keys(weapons.primary || {}).length > 0;
  const hasSecondaryWeapons = Object.keys(weapons.secondary || {}).length > 0;
  
  // Only process data if it exists
  const primaryWeapons = hasPrimaryWeapons
    ? Object.entries(weapons.primary)
        .map(([weapon, count]) => ({ weapon, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [];
  
  const secondaryWeapons = hasSecondaryWeapons
    ? Object.entries(weapons.secondary)
        .map(([weapon, count]) => ({ weapon, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [];
    
  const roleData = hasRoles
    ? Object.entries(roles)
        .map(([role, count]) => ({ role, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
    : [];
    
  const specData = hasSpecs
    ? Object.entries(specs)
        .map(([spec, count]) => ({ spec, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [];

  // Safe max calculations
  const maxPrimaryCount = primaryWeapons.length > 0 ? 
    Math.max(...primaryWeapons.map(item => item.count)) : 1;
  const maxSecondaryCount = secondaryWeapons.length > 0 ? 
    Math.max(...secondaryWeapons.map(item => item.count)) : 1;
  const maxRoleCount = roleData.length > 0 ? 
    Math.max(...roleData.map(item => item.count)) : 1;
  const maxSpecCount = specData.length > 0 ? 
    Math.max(...specData.map(item => item.count)) : 1;

  const hasAnyData = primaryWeapons.length > 0 || secondaryWeapons.length > 0 || 
                    roleData.length > 0 || specData.length > 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Combat Statistics
      </Typography>
      
      {!hasAnyData ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography color="text.secondary">
            No combat data available yet. Statistics will appear as members update their builds.
          </Typography>
        </Box>
      ) : (
        <>
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
          
          <Grid container spacing={2}>
            {primaryWeapons.length > 0 && (
              <Grid item xs={12} md={6}>
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
              </Grid>
            )}
            
            {secondaryWeapons.length > 0 && (
              <Grid item xs={12} md={6}>
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
              </Grid>
            )}
          </Grid>
          
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
        </>
      )}
    </Box>
  );
};

export default CombatStats;