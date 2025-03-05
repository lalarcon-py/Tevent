// src/components/DashboardComponents/SimpleCombatView.jsx
import React from 'react';
import { 
  Box, Grid, Typography, Card, CardContent, Alert
} from '@mui/material';

const SimpleCombatView = ({ data }) => (
  <Box>
    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
      Combat Statistics
    </Typography>
    
    {!data ? (
      <Alert severity="info">No combat statistics available yet.</Alert>
    ) : (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Class Distribution
              </Typography>
              {Object.entries(data.roles || {}).map(([role, count]) => (
                <Box key={role} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {role}
                    </Typography>
                    <Typography variant="body2">{count} players</Typography>
                  </Box>
                  <Box sx={{ 
                    height: 8, 
                    width: '100%', 
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 5,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      height: '100%', 
                      width: `${count * 100 / Math.max(...Object.values(data.roles || {}))}%`, 
                      bgcolor: '#64b5f6',
                      borderRadius: 5
                    }} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Weapon Distribution
              </Typography>
              {Object.entries(data.weapons?.primary || {}).slice(0, 5).map(([weapon, count]) => (
                <Box key={weapon} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {weapon}
                    </Typography>
                    <Typography variant="body2">{count} players</Typography>
                  </Box>
                  <Box sx={{ 
                    height: 8, 
                    width: '100%', 
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 5,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      height: '100%', 
                      width: `${count * 100 / Math.max(...Object.values(data.weapons?.primary || {}))}%`, 
                      bgcolor: '#ff9800',
                      borderRadius: 5
                    }} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )}
  </Box>
);

export default SimpleCombatView;