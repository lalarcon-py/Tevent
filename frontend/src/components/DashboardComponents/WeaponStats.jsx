// src/components/DashboardComponents/WeaponStats.jsx
import React from 'react';
import { 
  Typography, 
  Box, 
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert
} from '@mui/material';
import FilterFramesIcon from '@mui/icons-material/FilterFrames';

const WeaponStats = ({ data }) => {
  if (!data) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Weapon Statistics
        </Typography>
        <Alert severity="info">No weapon data available yet.</Alert>
      </Box>
    );
  }

  // Get weapon combinations from data
  const combinations = Array.isArray(data.weapon_combinations) 
    ? data.weapon_combinations
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [];

  // Get max count for percentage calculations
  const maxCount = combinations.length > 0 
    ? Math.max(...combinations.map(item => item.count || 0))
    : 1;

  // Colors for different class types
  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'tank': return { bg: 'rgba(33, 150, 243, 0.2)', color: '#42a5f5', border: 'rgba(33, 150, 243, 0.5)' };
      case 'healer': return { bg: 'rgba(76, 175, 80, 0.2)', color: '#66bb6a', border: 'rgba(76, 175, 80, 0.5)' };
      case 'dps': return { bg: 'rgba(244, 67, 54, 0.2)', color: '#ef5350', border: 'rgba(244, 67, 54, 0.5)' };
      default: return { bg: 'rgba(158, 158, 158, 0.2)', color: '#9e9e9e', border: 'rgba(158, 158, 158, 0.5)' };
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        Weapon Combinations
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Builds: {data.total_builds || 0}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2, opacity: 0.2 }} />
      
      {combinations.length > 0 ? (
        <List sx={{ p: 0 }}>
          {combinations.map((item, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)' }}>
                  <FilterFramesIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={item.combination}
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Box sx={{ display: 'flex', mb: 0.5 }}>
                      {item.specs && Object.entries(item.specs).slice(0, 3).map(([type, count], i) => (
                        <Box
                          key={i}
                          sx={{
                            px: 1,
                            py: 0.25,
                            mr: 0.5,
                            borderRadius: 1,
                            fontSize: '0.65rem',
                            bgcolor: getTypeColor(type).bg,
                            color: getTypeColor(type).color,
                            border: '1px solid',
                            borderColor: getTypeColor(type).border,
                          }}
                        >
                          {type} ({count})
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.count} builds
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round((item.count / maxCount) * 100)}%
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        height: 6, 
                        width: '100%', 
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 3,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <Box 
                        sx={{ 
                          height: '100%', 
                          width: `${(item.count / maxCount) * 100}%`,
                          bgcolor: '#ff9800',
                          borderRadius: 3
                        }} 
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No weapon combination data available.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WeaponStats;